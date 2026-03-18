import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PaymentIntentResponse } from '../types/payment';
import { generateGraphData } from '../utils/graphGenerator';
import CustomNode from './graph/CustomNode';
import CustomEdge from './graph/CustomEdge';

interface RoutingGraphProps {
  routeData: PaymentIntentResponse | null;
  selectedRouteId: string | null;
  onRouteSelect?: (routeId: string) => void;
  isLoading?: boolean;
}

const nodeTypes: Record<string, any> = {
  custom: CustomNode,
};

const edgeTypes: Record<string, any> = {
  custom: CustomEdge,
};

export const RoutingGraph: React.FC<RoutingGraphProps> = ({
  routeData,
  selectedRouteId,
  // onRouteSelect and isLoading are passed but not used yet
  // They're available for future enhancements
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [graphReady, setGraphReady] = useState(false);

  useEffect(() => {
    if (routeData) {
      const { nodes: newNodes, edges: newEdges } = generateGraphData(
        routeData,
        selectedRouteId
      );
      setNodes(newNodes);
      setEdges(newEdges);
      
      // Trigger animation
      setTimeout(() => {
        setGraphReady(true);
      }, 100);
    } else {
      setNodes([]);
      setEdges([]);
      setGraphReady(false);
    }
  }, [routeData, selectedRouteId, setNodes, setEdges]);

  if (!routeData) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="inline-block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-2 border-blue-500/50 border-t-blue-400 rounded-full"
            />
          </div>
          <p className="text-gray-400 mt-4">Awaiting payment analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: graphReady ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <style>{`
        .react-flow__node {
          border-radius: 8px;
        }
        .react-flow__node.selected {
          box-shadow: 0 0 24px rgba(59, 130, 246, 0.8);
        }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background
          color="#1e293b"
          variant={'dots' as any}
          gap={12}
          size={1}
        />
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data?.type === 'source' || n.data?.type === 'destination') {
              return '#3b82f6';
            }
            if (n.data?.isOptimal) {
              return '#10b981';
            }
            return '#64748b';
          }}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
        />
      </ReactFlow>

      {/* Floating Cost Summary */}
      {selectedRouteId && routeData.routes && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 right-6 bg-black/60 backdrop-blur-xl border border-blue-500/30 rounded-lg p-4 z-20"
        >
          {(() => {
            const route = routeData.routes.find((r) => r.route_id === selectedRouteId);
            if (!route) return null;
            return (
              <div className="text-sm">
                <p className="text-gray-400 mb-2 font-mono">
                  {route.provider.toUpperCase()}
                </p>
                <div className="space-y-1">
                  <p className="text-green-400 font-bold">
                    ${route.cost.total_cost.toFixed(2)}
                  </p>
                  <p className="text-gray-300">
                    {route.estimated_time_minutes} min
                  </p>
                  <p className="text-blue-300">
                    {(route.reliability_score * 100).toFixed(0)}% reliable
                  </p>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </motion.div>
  );
};
