import { Node, Edge } from 'reactflow';
import { PaymentIntentResponse } from '../types/payment';

const VERTICAL_SPACING = 120;
const HORIZONTAL_SPACING = 180;

export const generateGraphData = (
  data: PaymentIntentResponse,
  selectedRouteId: string | null
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Source Node
  nodes.push({
    id: 'source',
    data: {
      label: data.source_currency,
      type: 'source',
      currency: data.source_currency,
      health: 0.99,
      latency: 5,
      liquidity: 500000,
    },
    position: { x: 0, y: 0 },
    type: 'custom',
  });

  // Destination Node
  nodes.push({
    id: 'destination',
    data: {
      label: data.destination_currency,
      type: 'destination',
      currency: data.destination_currency,
      health: 0.99,
      latency: 10,
      liquidity: 250000,
    },
    position: { x: 1200, y: 0 },
    type: 'custom',
  });

  // Create intermediate nodes and edges for each route
  const uniqueProviders = new Set<string>();
  const providerPositions: Map<string, { x: number; y: number }> = new Map();

  data.routes.forEach((route) => {
    // Track unique providers for positioning
    route.steps.forEach((step, stepIndex) => {
      if (!uniqueProviders.has(step)) {
        uniqueProviders.add(step);
        
        // Position intermediate nodes
        const nodeCount = uniqueProviders.size;
        const verticalOffset = (nodeCount - 1) * VERTICAL_SPACING - (VERTICAL_SPACING * (data.routes.length - 1)) / 2;
        
        providerPositions.set(step, {
          x: HORIZONTAL_SPACING * (stepIndex + 1),
          y: verticalOffset,
        });
      }
    });

    // Create nodes and edges for this route
    let prevNodeId = 'source';

    route.steps.forEach((step, stepIndex) => {
      const nodeId = `${step}-${stepIndex}`;
      
      // Avoid duplicate nodes - check if we already created this provider node
      const existingNode = nodes.find((n) => n.id === nodeId);
      
      if (!existingNode) {
        const position = providerPositions.get(step) || { x: 0, y: 0 };
        
        nodes.push({
          id: nodeId,
          data: {
            label: step,
            type: getNodeType(step),
            provider: route.provider,
            health: 0.95 + Math.random() * 0.05,
            latency: 20 + Math.random() * 50,
            liquidity: 100000 + Math.random() * 400000,
          },
          position,
          type: 'custom',
        });
      }

      // Create edge
      const edgeId = `${prevNodeId}-${nodeId}-${route.route_id}`;
      const isOptimal = selectedRouteId === route.route_id;
      
      edges.push({
        id: edgeId,
        source: prevNodeId,
        target: nodeId,
        type: 'custom',
        animated: isOptimal,
        data: {
          routeId: route.route_id,
          cost: route.cost.total_cost,
          fee: route.cost.provider_fee,
          eta: route.estimated_time_minutes,
          successProbability: route.reliability_score,
          riskScore: 1 - route.reliability_score,
          lastUpdated: data.timestamp,
          isOptimal,
          liquidity: 150000 + Math.random() * 350000,
        },
      });

      prevNodeId = nodeId;
    });

    // Final edge to destination
    const finalEdgeId = `${prevNodeId}-destination-${route.route_id}`;
    edges.push({
      id: finalEdgeId,
      source: prevNodeId,
      target: 'destination',
      type: 'custom',
      animated: selectedRouteId === route.route_id,
      data: {
        routeId: route.route_id,
        cost: route.cost.off_ramp_cost,
        fee: route.cost.provider_fee,
        eta: route.estimated_time_minutes,
        successProbability: route.reliability_score,
        riskScore: 1 - route.reliability_score,
        lastUpdated: data.timestamp,
        isOptimal: selectedRouteId === route.route_id,
      },
    });
  });

  return { nodes, edges };
};

const getNodeType = (step: string): string => {
  const lower = step.toLowerCase();

  if (lower.includes('blockchain') || lower.includes('solana') || lower.includes('ethereum') || lower.includes('polygon') || lower.includes('usdc') || lower.includes('usdt')) {
    return 'blockchain';
  }
  if (lower.includes('bank') || lower.includes('correspondent')) {
    return 'bank';
  }
  if (lower.includes('processor') || lower.includes('wire')) {
    return 'processor';
  }
  if (lower.includes('fx') || lower.includes('exchange') || lower.includes('wise')) {
    return 'fx_provider';
  }
  if (lower.includes('off-ramp') || lower.includes('offramp') || lower.includes('payout')) {
    return 'off_ramp';
  }
  if (lower.includes('settlement') || lower.includes('final')) {
    return 'settlement';
  }

  return 'bank'; // Default
};
