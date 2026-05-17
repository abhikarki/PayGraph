import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { FC } from "react";
import type {
  GraphData,
  PairEdge,
  TokenNode,
  Route,
  RoutesData,
  HistoryData,
  StatusData,
  OptimizeMode,
} from "./types";

const API_BASE = "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function useGraph(interval = 60000) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    try {
      setData(await apiFetch<GraphData>("/graph"));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, interval);
    return () => clearInterval(id);
  }, [fetch_, interval]);
  return { data, loading, error, refetch: fetch_ };
}

function useRoutes(from: string | null, to: string | null, mode: OptimizeMode) {
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!from || !to || from === to) { setData(null); return; }
    setLoading(true);
    apiFetch<RoutesData>(`/routes?from_token=${from}&to_token=${to}&optimize=${mode}`)
      .then(d => { setData(d); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [from, to, mode]);
  return { data, loading, error };
}

function useHistory(pairId: string | null, hours: number) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!pairId) return;
    setLoading(true);
    apiFetch<HistoryData>(`/history/${pairId}?hours=${hours}`)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [pairId, hours]);
  return { data, loading };
}

function useStatus(interval = 15000) {
  const [data, setData] = useState<StatusData | null>(null);
  useEffect(() => {
    const f = () => apiFetch<StatusData>("/status").then(setData).catch(() => {});
    f();
    const id = setInterval(f, interval);
    return () => clearInterval(id);
  }, [interval]);
  return data;
}

const TOKEN_COLORS: Record<string, string> = {
  WETH:  "#627EEA",
  USDC:  "#2775CA",
  USDT:  "#26A17B",
  DAI:   "#F5AC37",
  WBTC:  "#F7931A",
  UNI:   "#FF007A",
  LINK:  "#2A5ADA",
};

function scoreColor(score: number): string {
  // score ≈ 0 (great) → green; ≈ 2+ (bad) → red
  const t = Math.min(score / 2, 1);
  const r = Math.round(34 + t * (239 - 34));
  const g = Math.round(197 - t * (197 - 68));
  const b = Math.round(94 - t * (94 - 68));
  return `rgb(${r},${g},${b})`;
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimEdge {
  source: string;
  target: string;
  score: number;
  liquidity_usd: number;
  exchange: string;
  pair_id: string;
}

function useForceSimulation(
  nodes: TokenNode[],
  edges: PairEdge[],
  width: number,
  height: number
) {
  const simNodes = useRef<Map<string, SimNode>>(new Map());

  // Initialise new nodes in a circle
  useEffect(() => {
    const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.32;
    nodes.forEach((n, i) => {
      if (!simNodes.current.has(n.id)) {
        const angle = (i / nodes.length) * 2 * Math.PI;
        simNodes.current.set(n.id, {
          id: n.id,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          vx: 0, vy: 0,
        });
      }
    });
    // Remove stale nodes
    for (const key of simNodes.current.keys()) {
      if (!nodes.find(n => n.id === key)) simNodes.current.delete(key);
    }
  }, [nodes, width, height]);

  const tick = useCallback(() => {
    const cx = width / 2, cy = height / 2;
    const ns = Array.from(simNodes.current.values());
    const edgeMap = new Map<string, SimEdge[]>();
    edges.forEach(e => {
      const push = (k: string, v: SimEdge) => {
        if (!edgeMap.has(k)) edgeMap.set(k, []);
        edgeMap.get(k)!.push(v);
      };
      const se: SimEdge = { source: e.source, target: e.target, score: e.score, liquidity_usd: e.liquidity_usd, exchange: e.exchange, pair_id: e.pair_id };
      push(e.source, se); push(e.target, se);
    });

    const REPULSION = 8000;
    const SPRING = 0.035;
    const IDEAL_LEN = 160;
    const DAMPING = 0.82;
    const CENTER_PULL = 0.008;

    // Repulsion
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        const fx = force * dx / dist, fy = force * dy / dist;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Spring (edges)
    edges.forEach(e => {
      const a = simNodes.current.get(e.source);
      const b = simNodes.current.get(e.target);
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - IDEAL_LEN) * SPRING;
      const fx = force * dx / dist, fy = force * dy / dist;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });

    // Centre gravity + damping + integrate
    ns.forEach(n => {
      n.vx += (cx - n.x) * CENTER_PULL;
      n.vy += (cy - n.y) * CENTER_PULL;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x += n.vx; n.y += n.vy;
      // Boundary
      n.x = Math.max(48, Math.min(width - 48, n.x));
      n.y = Math.max(48, Math.min(height - 48, n.y));
    });
  }, [edges, width, height]);

  return { simNodes: simNodes.current, tick };
}

interface SparkProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

const Spark: FC<SparkProps> = ({ values, color, width = 160, height = 40 }) => {
  if (values.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};


const BuySellBar: FC<{ buys: number; sells: number }> = ({ buys, sells }) => {
  const total = Math.max(buys + sells, 1);
  const buyW = (buys / total) * 100;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#ef4444", width: "100%" }}>
      <div style={{ width: `${buyW}%`, background: "#22c55e", transition: "width 0.5s" }} />
    </div>
  );
};

const DEXRouter: FC = () => {
  // State
  const [fromToken, setFromToken] = useState<string | null>(null);
  const [toToken, setToToken] = useState<string | null>(null);
  const [optimize, setOptimize] = useState<OptimizeMode>("balanced");
  const [selectedEdge, setSelectedEdge] = useState<PairEdge | null>(null);
  const [historyHours, setHistoryHours] = useState(24);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Data
  const { data: graph, loading: gLoading, error: gError, refetch } = useGraph(60000);
  const { data: routes, loading: rLoading } = useRoutes(fromToken, toToken, optimize);
  const { data: history } = useHistory(selectedEdge?.pair_id ?? null, historyHours);
  const status = useStatus();

  // Canvas resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setCanvasSize({ w: e.contentRect.width, h: Math.max(e.contentRect.height, 400) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Nodes & edges derived from graph
  const nodes = useMemo(() => graph?.nodes ?? [], [graph]);
  const edges = useMemo(() => graph?.edges ?? [], [graph]);

  const { simNodes, tick } = useForceSimulation(nodes, edges, canvasSize.w, canvasSize.h);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      tick();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Build highlighted edge set
      const hlEdges = new Set<string>();
      if (highlightedPath.length > 1) {
        for (let i = 0; i < highlightedPath.length - 1; i++) {
          hlEdges.add(`${highlightedPath[i]}-${highlightedPath[i + 1]}`);
          hlEdges.add(`${highlightedPath[i + 1]}-${highlightedPath[i]}`);
        }
      }

      // Draw edges
      edges.forEach(e => {
        const a = simNodes.get(e.source);
        const b = simNodes.get(e.target);
        if (!a || !b) return;

        const isHighlighted = hlEdges.has(`${e.source}-${e.target}`);
        const isSelected = selectedEdge?.pair_id === e.pair_id;

        const liqNorm = Math.min(e.liquidity_usd / 50_000_000, 1);
        const lineW = 1 + liqNorm * 5;

        ctx.lineWidth = isHighlighted ? lineW + 2 : lineW;
        if (isHighlighted) {
          ctx.strokeStyle = "#facc15";
          ctx.shadowColor = "#facc15";
          ctx.shadowBlur = 12;
        } else if (isSelected) {
          ctx.strokeStyle = "#e2e8f0";
          ctx.shadowColor = "#e2e8f0";
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = scoreColor(e.score);
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Mid-point label (exchange name, small)
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        ctx.textAlign = "center";
        ctx.fillText(e.exchange.replace("uniswap", "uni").toUpperCase(), mx, my - 4);
      });

      // Draw nodes
      nodes.forEach(n => {
        const pos = simNodes.get(n.id);
        if (!pos) return;
        const isFrom = fromToken === n.id;
        const isTo = toToken === n.id;
        const isInPath = highlightedPath.includes(n.id);
        const color = TOKEN_COLORS[n.id] ?? "#94a3b8";
        const r = 24;

        // Glow
        if (isFrom || isTo || isInPath) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 20;
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = isFrom ? "#22c55e" : isTo ? "#f97316" : isInPath ? "#facc15" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Node fill
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(pos.x - 6, pos.y - 6, 2, pos.x, pos.y, r);
        grad.addColorStop(0, color + "ff");
        grad.addColorStop(1, color + "88");
        ctx.fillStyle = grad;
        ctx.fill();

        // Label
        ctx.font = "bold 11px 'Space Mono', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.id, pos.x, pos.y);

        ctx.textBaseline = "alphabetic";
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges, simNodes, tick, highlightedPath, fromToken, toToken, selectedEdge]);

  const getNodeAt = (cx: number, cy: number): string | null => {
    for (const n of nodes) {
      const pos = simNodes.get(n.id);
      if (!pos) continue;
      const dx = pos.x - cx, dy = pos.y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 28) return n.id;
    }
    return null;
  };

  const getEdgeAt = (cx: number, cy: number): PairEdge | null => {
    for (const e of edges) {
      const a = simNodes.get(e.source), b = simNodes.get(e.target);
      if (!a || !b) continue;
      // Distance from point to line segment
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((cx - a.x) * dx + (cy - a.y) * dy) / (dx * dx + dy * dy)));
      const nx = a.x + t * dx - cx, ny = a.y + t * dy - cy;
      if (Math.sqrt(nx * nx + ny * ny) < 10) return e;
    }
    return null;
  };

  const handleCanvasClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;

    const node = getNodeAt(cx, cy);
    if (node) {
      if (!fromToken) { setFromToken(node); return; }
      if (!toToken && node !== fromToken) { setToToken(node); return; }
      // Reset
      setFromToken(node); setToToken(null); setHighlightedPath([]);
      return;
    }
    const edge = getEdgeAt(cx, cy);
    if (edge) { setSelectedEdge(prev => prev?.pair_id === edge.pair_id ? null : edge); }
  };

  const handleMouseDown = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const node = getNodeAt(ev.clientX - rect.left, ev.clientY - rect.top);
    if (node) setDraggingNode(node);
  };

  const handleMouseMove = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingNode) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const n = simNodes.get(draggingNode);
    if (n) { n.x = ev.clientX - rect.left; n.y = ev.clientY - rect.top; n.vx = 0; n.vy = 0; }
  };

  const handleMouseUp = () => setDraggingNode(null);

  // When routes change, highlight top route
  useEffect(() => {
    if (routes?.routes[0]) {
      setHighlightedPath(routes.routes[0].hops);
    } else {
      setHighlightedPath([]);
    }
  }, [routes]);

  const S = {
    root: {
      fontFamily: "'Space Mono', 'Courier New', monospace",
      background: "#080c14",
      color: "#e2e8f0",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    topbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(15,23,42,0.9)",
      backdropFilter: "blur(12px)",
      position: "sticky" as const,
      top: 0,
      zIndex: 100,
    },
    logo: {
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: "#facc15",
      textTransform: "uppercase" as const,
    },
    statusDot: (ok: boolean) => ({
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: ok ? "#22c55e" : "#ef4444",
      display: "inline-block",
      marginRight: 6,
      boxShadow: `0 0 6px ${ok ? "#22c55e" : "#ef4444"}`,
    }),
    body: {
      display: "flex",
      flex: 1,
      overflow: "hidden",
      height: "calc(100vh - 49px)",
    },
    sidebar: {
      width: 280,
      minWidth: 280,
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      flexDirection: "column" as const,
      overflowY: "auto" as const,
      background: "rgba(15,23,42,0.6)",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      position: "relative" as const,
    },
    rightPanel: {
      width: 300,
      minWidth: 300,
      borderLeft: "1px solid rgba(255,255,255,0.07)",
      overflowY: "auto" as const,
      background: "rgba(15,23,42,0.6)",
    },
    section: {
      padding: "14px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    sectionTitle: {
      fontSize: 9,
      letterSpacing: "0.18em",
      color: "#64748b",
      textTransform: "uppercase" as const,
      marginBottom: 10,
    },
    btn: (active: boolean, color = "#facc15") => ({
      padding: "5px 10px",
      borderRadius: 4,
      border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
      background: active ? `${color}18` : "transparent",
      color: active ? color : "#94a3b8",
      fontSize: 10,
      cursor: "pointer",
      letterSpacing: "0.08em",
      transition: "all 0.15s",
    }),
    tokenBtn: (sym: string, isFrom: boolean, isTo: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 5,
      border: `1px solid ${isFrom ? "#22c55e44" : isTo ? "#f9741644" : "rgba(255,255,255,0.06)"}`,
      background: isFrom ? "#22c55e0a" : isTo ? "#f974160a" : "transparent",
      cursor: "pointer",
      marginBottom: 4,
      transition: "all 0.15s",
    }),
    dot: (color: string) => ({
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
    }),
    routeCard: (rank: number) => ({
      padding: "10px 12px",
      borderRadius: 6,
      border: `1px solid ${rank === 1 ? "#facc1540" : "rgba(255,255,255,0.07)"}`,
      background: rank === 1 ? "#facc150a" : "rgba(255,255,255,0.02)",
      marginBottom: 8,
      cursor: "pointer",
    }),
    hops: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      flexWrap: "wrap" as const,
      marginBottom: 6,
    },
    hopToken: (color: string) => ({
      padding: "2px 7px",
      borderRadius: 3,
      background: `${color}22`,
      color,
      fontSize: 11,
      fontWeight: 700,
    }),
    arrow: { color: "#475569", fontSize: 12 },
    metaRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 10,
      color: "#64748b",
      marginBottom: 3,
    },
    edgeCard: {
      padding: "12px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    label: { fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" as const },
    value: { fontSize: 13, color: "#e2e8f0", marginBottom: 8 },
    slider: {
      width: "100%",
      accentColor: "#facc15",
    },
  };

  const tokens = Object.keys(TOKEN_COLORS);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input[type=range] { cursor: pointer; }
      `}</style>

      <div style={S.root}>
        {/* ── Topbar ── */}
        <div style={S.topbar}>
          <span style={S.logo}>⬡ DEX Router</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 10, color: "#64748b" }}>
            {status && (
              <>
                <span>
                  <span style={S.statusDot(status.healthy)} />
                  {status.pairs_resolved}/{status.total_pairs} pairs
                </span>
                <span>{status.api_calls_last_hour} API calls/hr</span>
                {status.last_poll_at && (
                  <span>polled {new Date(status.last_poll_at).toLocaleTimeString()}</span>
                )}
              </>
            )}
            <button onClick={refetch} style={{ ...S.btn(false), fontSize: 9 }}>↻ Refresh</button>
          </div>
        </div>

        <div style={S.body}>
          {/* ── Left sidebar: token picker + optimize ── */}
          <div style={S.sidebar}>
            <div style={S.section}>
              <div style={S.sectionTitle}>From Token</div>
              {tokens.map(sym => (
                <div
                  key={sym}
                  style={S.tokenBtn(sym, fromToken === sym, false)}
                  onClick={() => { setFromToken(sym); if (toToken === sym) setToToken(null); }}
                >
                  <div style={S.dot(TOKEN_COLORS[sym])} />
                  <span style={{ fontSize: 12 }}>{sym}</span>
                  {fromToken === sym && <span style={{ marginLeft: "auto", fontSize: 9, color: "#22c55e" }}>FROM</span>}
                </div>
              ))}
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>To Token</div>
              {tokens.map(sym => (
                <div
                  key={sym}
                  style={S.tokenBtn(sym, false, toToken === sym)}
                  onClick={() => { if (sym !== fromToken) setToToken(sym); }}
                >
                  <div style={S.dot(TOKEN_COLORS[sym])} />
                  <span style={{ fontSize: 12 }}>{sym}</span>
                  {toToken === sym && <span style={{ marginLeft: "auto", fontSize: 9, color: "#f97316" }}>TO</span>}
                </div>
              ))}
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Optimise For</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(["balanced", "liquidity", "fees"] as OptimizeMode[]).map(m => (
                  <button key={m} style={{ ...S.btn(optimize === m), width: "100%", textAlign: "left" }} onClick={() => setOptimize(m)}>
                    {m === "balanced" && "⚖ Balanced"}
                    {m === "liquidity" && "💧 Deepest Liquidity"}
                    {m === "fees" && "⚡ Fewest Hops"}
                  </button>
                ))}
              </div>
            </div>

            {(fromToken || toToken) && (
              <div style={S.section}>
                <button
                  style={{ ...S.btn(false, "#ef4444"), width: "100%", textAlign: "center" }}
                  onClick={() => { setFromToken(null); setToToken(null); setHighlightedPath([]); }}
                >
                  ✕ Clear Selection
                </button>
              </div>
            )}

            {/* Legend */}
            <div style={{ ...S.section, marginTop: "auto" }}>
              <div style={S.sectionTitle}>Edge Score Legend</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "linear-gradient(to right, #22c55e, #ef4444)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b" }}>
                <span>Best (low score)</span><span>Worst (high score)</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 9, color: "#475569", lineHeight: 1.5 }}>
                Edge thickness = liquidity depth<br />
                Yellow = highlighted route
              </div>
            </div>
          </div>

          {/* ── Main canvas ── */}
          <div style={S.main} ref={containerRef}>
            {gLoading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 12 }}>
                Loading graph data…
              </div>
            )}
            {gError && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 12 }}>
                Backend error: {gError}
                <br /><span style={{ color: "#64748b" }}>Is FastAPI running on port 8000?</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              style={{ display: "block", cursor: draggingNode ? "grabbing" : "crosshair" }}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {/* Instruction overlay when no selection */}
            {!fromToken && !gLoading && !gError && (
              <div style={{
                position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                fontSize: 10, color: "#475569", background: "rgba(8,12,20,0.8)",
                padding: "6px 14px", borderRadius: 20, letterSpacing: "0.06em",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                Click a token node to set FROM • click another for TO • drag nodes to rearrange
              </div>
            )}
          </div>

          {/* ── Right panel: routes + edge detail + history ── */}
          <div style={S.rightPanel}>
            {/* Routes */}
            {(fromToken && toToken) ? (
              <div style={S.section}>
                <div style={S.sectionTitle}>
                  Routes: {fromToken} → {toToken}
                </div>
                {rLoading ? (
                  <div style={{ color: "#64748b", fontSize: 11 }}>Computing routes…</div>
                ) : routes?.routes.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 11 }}>No routes found between these tokens.</div>
                ) : (
                  routes?.routes.map((route: Route) => (
                    <div
                      key={route.rank}
                      style={S.routeCard(route.rank)}
                      onClick={() => setHighlightedPath(route.hops)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: "#facc15", letterSpacing: "0.1em" }}>
                          #{route.rank} ROUTE
                        </span>
                        <span style={{ fontSize: 9, color: "#64748b" }}>
                          score {route.total_score.toFixed(4)}
                        </span>
                      </div>
                      <div style={S.hops}>
                        {route.hops.map((h, i) => (
                          <span key={i}>
                            <span style={S.hopToken(TOKEN_COLORS[h] ?? "#94a3b8")}>{h}</span>
                            {i < route.hops.length - 1 && <span style={S.arrow}> → </span>}
                          </span>
                        ))}
                      </div>
                      <div style={S.metaRow}>
                        <span>Liquidity</span>
                        <span style={{ color: "#e2e8f0" }}>{fmtUsd(route.total_liquidity_usd)}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.4 }}>{route.reason}</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ ...S.section, color: "#475569", fontSize: 11 }}>
                Select FROM and TO tokens on the left (or click graph nodes) to find routes.
              </div>
            )}

            {/* Edge detail */}
            {selectedEdge && (
              <div>
                <div style={{ ...S.section, paddingBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={S.sectionTitle}>{selectedEdge.pair_id} Details</div>
                    <button style={{ ...S.btn(false), fontSize: 9 }} onClick={() => setSelectedEdge(null)}>✕</button>
                  </div>
                </div>
                <div style={S.edgeCard}>
                  <div style={S.label}>Exchange</div>
                  <div style={S.value}>{selectedEdge.exchange}</div>

                  <div style={S.label}>Price (USD)</div>
                  <div style={S.value}>{selectedEdge.price_usd > 0 ? `$${selectedEdge.price_usd.toFixed(6)}` : "—"}</div>

                  <div style={S.label}>Liquidity</div>
                  <div style={S.value}>{fmtUsd(selectedEdge.liquidity_usd)}</div>

                  <div style={S.label}>Volume 1h / 24h</div>
                  <div style={S.value}>{fmtUsd(selectedEdge.volume_1h)} / {fmtUsd(selectedEdge.volume_24h)}</div>

                  <div style={S.label}>Price Change 1h / 24h</div>
                  <div style={{ ...S.value, color: selectedEdge.price_change_1h >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmtPct(selectedEdge.price_change_1h)} / {fmtPct(selectedEdge.price_change_24h)}
                  </div>

                  <div style={S.label}>Buys / Sells (1h)</div>
                  <div style={{ ...S.value, marginBottom: 4 }}>
                    <span style={{ color: "#22c55e" }}>{selectedEdge.buys_1h}</span>
                    {" / "}
                    <span style={{ color: "#ef4444" }}>{selectedEdge.sells_1h}</span>
                  </div>
                  <BuySellBar buys={selectedEdge.buys_1h} sells={selectedEdge.sells_1h} />
                  <div style={{ ...S.metaRow, marginTop: 4 }}>
                    <span style={{ color: "#22c55e" }}>BUY</span>
                    <span style={{ color: "#ef4444" }}>SELL</span>
                  </div>

                  <div style={S.label}>Route Score</div>
                  <div style={{ ...S.value, color: scoreColor(selectedEdge.score) }}>
                    {selectedEdge.score.toFixed(4)}
                  </div>

                  <div style={S.label}>Pair Address</div>
                  <div style={{ fontSize: 9, color: "#475569", wordBreak: "break-all" as const, marginBottom: 8 }}>
                    {selectedEdge.pair_address || "—"}
                  </div>
                </div>

                {/* History */}
                <div style={S.section}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={S.sectionTitle}>History</div>
                    <span style={{ fontSize: 9, color: "#64748b" }}>{historyHours}h window</span>
                  </div>
                  <input
                    type="range" min={1} max={72} value={historyHours}
                    onChange={e => setHistoryHours(Number(e.target.value))}
                    style={S.slider}
                  />
                  {history && history.snapshots.length > 0 ? (
                    <>
                      <div style={{ marginTop: 12 }}>
                        <div style={S.label}>Price USD</div>
                        <Spark values={history.snapshots.map(s => s.price_usd)} color="#facc15" width={268} height={44} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={S.label}>Liquidity USD</div>
                        <Spark values={history.snapshots.map(s => s.liquidity_usd)} color="#22c55e" width={268} height={44} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={S.label}>Volume 1h</div>
                        <Spark values={history.snapshots.map(s => s.volume_1h)} color="#627EEA" width={268} height={44} />
                      </div>
                      <div style={{ marginTop: 8, fontSize: 9, color: "#475569" }}>
                        {history.snapshots.length} snapshots over {historyHours}h
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>
                      No history yet — snapshots accumulate every 60s
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DEXRouter;
