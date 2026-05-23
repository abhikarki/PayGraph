import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './TokenGraph.css'
import type { PairData } from './types'

interface TokenGraphProps {
  pairs: PairData[]
  onEdgeClick?: (pair: PairData) => void
}

interface Node extends d3.SimulationNodeDatum {
  id: string
  label: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node | string
  target: Node | string
  value: number
  label: string
}

export function TokenGraph({ pairs, onEdgeClick }: TokenGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null)
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const linksRef = useRef<Link[]>([])
  const pairsRef = useRef<Map<string, PairData>>(new Map())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Initialize graph structure only once
  useEffect(() => {
    if (!svgRef.current || pairs.length === 0) return

    // Only initialize once
    if (simulationRef.current) return

    const container = svgRef.current.parentElement as HTMLElement
    const width = container.clientWidth
    const height = container.clientHeight

    // Build initial nodes and links
    const nodesMap = new Map<string, Node>()
    const links: Link[] = []

    pairs.forEach(pair => {
      if (!nodesMap.has(pair.token0)) {
        nodesMap.set(pair.token0, {
          id: pair.token0,
          label: pair.token0,
          x: width / 2 + (Math.random() - 0.5) * 100,
          y: height / 2 + (Math.random() - 0.5) * 100,
          fx: undefined,
          fy: undefined,
        })
      }
      if (!nodesMap.has(pair.token1)) {
        nodesMap.set(pair.token1, {
          id: pair.token1,
          label: pair.token1,
          x: width / 2 + (Math.random() - 0.5) * 100,
          y: height / 2 + (Math.random() - 0.5) * 100,
          fx: undefined,
          fy: undefined,
        })
      }

      const slippage = pair.metrics?.estimated_slippage_1pct || 0
      const priceImpact = pair.metrics?.price_impact_1pct || 0
      const linkKey = `${pair.token0}-${pair.token1}`
      links.push({
        source: pair.token0,
        target: pair.token1,
        value: pair.pair_address_count || 0,
        label: `S: ${slippage.toFixed(2)}% | P: ${priceImpact.toFixed(4)}%`,
      })
      pairsRef.current.set(linkKey, pair)
    })

    nodesRef.current = nodesMap
    linksRef.current = links
    const nodes = Array.from(nodesMap.values())

    // Set up SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Create force simulation with increased spacing for readability
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(300) // Doubled from 150
          .strength(0.2) // Reduced for more spread
      )
      .force('charge', d3.forceManyBody().strength(-1200)) // Increased from -500
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(80)) // Increased from 50
      .stop() // Stop immediately, we'll tick manually

    // Let it stabilize longer
    for (let i = 0; i < 500; ++i) simulation.tick()

    simulationRef.current = simulation

    // Create arrow marker for directed edges
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 25)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .style('fill', '#90caf9')

    // Create groups for better organization
    const g = svg.append('g')

    // Draw links
    const linkGroup = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links, (d: any, i: number) => `${d.source.id}-${d.target.id}-${i}`)
      .enter()
      .append('line')
      .attr('stroke', '#90caf9')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    // Draw invisible thick lines for easier clicking
    const linkHitArea = g
      .append('g')
      .attr('class', 'link-hit-areas')
      .selectAll('line')
      .data(links, (d: any, i: number) => `${d.source.id}-${d.target.id}-${i}`)
      .enter()
      .append('line')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 15)
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)
      .style('cursor', 'pointer')
      .on('click', (_: any, d: any) => {
        const linkKey = `${d.source.id}-${d.target.id}`
        const pairData = pairsRef.current.get(linkKey)
        console.log('Edge clicked:', linkKey, pairData)
        if (pairData && onEdgeClick) {
          onEdgeClick(pairData)
        }
      })

    // Draw link labels
    const linkLabels = g
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-5px')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .attr('class', 'edge-label')
      .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
      .attr('y', (d: any) => (d.source.y + d.target.y) / 2)
      .text((d: any) => d.label)

    // Draw nodes
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 25) // Responsive sizing will be in CSS
      .attr('fill', '#4CAF50')
      .attr('stroke', '#2e7d32')
      .attr('stroke-width', 2)
      .attr('class', 'node')
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y)
      .style('cursor', 'pointer')
      .on('click', (_: any, d: any) => {
        setSelectedNode(selectedNode === d.id ? null : d.id)
      })
      .on('mouseover', (_: any, d: any) => {
        setHoveredNode(d.id)
      })
      .on('mouseout', () => {
        setHoveredNode(null)
      })

    // Draw node labels
    const labels = g
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .attr('x', (d: any) => d.x)
      .attr('y', (d: any) => d.y)
      .text((d: Node) => d.label)

    // Store references for updates
    ;(svgRef.current as any)._linkGroup = linkGroup
    ;(svgRef.current as any)._linkHitArea = linkHitArea
    ;(svgRef.current as any)._linkLabels = linkLabels
    ;(svgRef.current as any)._nodeGroup = nodeGroup
    ;(svgRef.current as any)._labels = labels

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      svg.attr('width', newWidth).attr('height', newHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Update only edge labels when pairs data changes
  useEffect(() => {
    if (!svgRef.current || pairs.length === 0 || !simulationRef.current) return

    pairsRef.current.clear()
    const links: Link[] = []
    pairs.forEach(pair => {
      const slippage = pair.metrics?.estimated_slippage_1pct || 0
      const priceImpact = pair.metrics?.price_impact_1pct || 0
      const linkKey = `${pair.token0}-${pair.token1}`
      links.push({
        source: pair.token0,
        target: pair.token1,
        value: pair.pair_address_count || 0,
        label: `S: ${slippage.toFixed(2)}% | P: ${priceImpact.toFixed(4)}%`,
      })
      pairsRef.current.set(linkKey, pair)
    })

    linksRef.current = links

    // Update link labels only
    const linkLabels = d3.select(svgRef.current).select('.link-labels')
    linkLabels
      .selectAll('text')
      .data(links, (d: any) => `${d.source}-${d.target}`)
      .text((d: any) => d.label)
  }, [pairs])

  // Update styles when hover/select changes
  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .selectAll('.node')
      .attr('class', (d: any) => {
        let classes = 'node'
        if (d.id === selectedNode) classes += ' selected'
        if (d.id === hoveredNode) classes += ' hovered'
        return classes
      })
  }, [selectedNode, hoveredNode])

  return (
    <svg ref={svgRef} className="token-graph-svg" />
  )
}
