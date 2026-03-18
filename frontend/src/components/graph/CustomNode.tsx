import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';

interface CustomNodeProps {
  data: {
    label: string;
    type: string;
    provider?: string;
    health?: number;
    latency?: number;
    liquidity?: number;
    currency?: string;
  };
  isConnectable: boolean;
  selected?: boolean;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, isConnectable, selected }) => {
  const [hovering, setHovering] = useState(false);

  const getNodeColor = () => {
    switch (data.type) {
      case 'source':
      case 'destination':
        return 'from-blue-600 to-blue-400';
      case 'blockchain':
        return 'from-purple-600 to-pink-400';
      case 'bank':
        return 'from-slate-600 to-slate-400';
      case 'processor':
        return 'from-amber-600 to-amber-400';
      case 'fx_provider':
        return 'from-cyan-600 to-cyan-400';
      case 'off_ramp':
        return 'from-orange-600 to-orange-400';
      case 'settlement':
        return 'from-green-600 to-green-400';
      default:
        return 'from-gray-600 to-gray-400';
    }
  };

  const getNodeIcon = () => {
    switch (data.type) {
      case 'source':
        return '📤';
      case 'destination':
        return '📥';
      case 'blockchain':
        return '⛓️';
      case 'bank':
        return '🏦';
      case 'processor':
        return '⚙️';
      case 'fx_provider':
        return '💱';
      case 'off_ramp':
        return '🌉';
      case 'settlement':
        return '✅';
      default:
        return '●';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`
          relative rounded-lg px-4 py-3 min-w-[120px] text-center
          bg-gradient-to-br ${getNodeColor()}
          shadow-lg border border-white/20
          transition-all duration-300
          ${selected ? 'ring-2 ring-white/50 shadow-2xl' : ''}
          ${hovering ? 'scale-105 shadow-2xl' : ''}
          cursor-pointer
        `}
      >
        <div className="text-2xl mb-1">{getNodeIcon()}</div>
        <div className="text-xs font-bold text-white">
          {data.label}
        </div>
        {data.provider && (
          <div className="text-xs text-white/70 truncate">
            {data.provider}
          </div>
        )}

        {/* Hover Tooltip */}
        {hovering && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 bg-black/90 text-white text-xs rounded-lg p-3 whitespace-nowrap z-50"
          >
            <div className="font-mono font-bold mb-2">{data.label}</div>
            {data.health && (
              <div className="text-green-300">
                Health: {(data.health * 100).toFixed(0)}%
              </div>
            )}
            {data.latency && (
              <div className="text-blue-300">
                Latency: {data.latency}ms
              </div>
            )}
            {data.liquidity && (
              <div className="text-cyan-300">
                Liquidity: ${(data.liquidity / 1000).toFixed(1)}k
              </div>
            )}
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/90 absolute left-1/2 -translate-x-1/2 -bottom-1" />
          </motion.div>
        )}
      </div>

      <Handle position={Position.Left} type="target" isConnectable={isConnectable} />
      <Handle position={Position.Right} type="source" isConnectable={isConnectable} />
    </motion.div>
  );
};

export default CustomNode;
