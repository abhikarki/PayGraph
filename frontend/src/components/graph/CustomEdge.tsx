import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from 'reactflow';
import { motion } from 'framer-motion';

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}) => {
  const [hovering, setHovering] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const getEdgeColor = () => {
    if (data?.isOptimal) {
      return '#10b981'; // Green for optimal
    }
    if (data?.riskScore && data.riskScore > 0.7) {
      return '#ef4444'; // Red for high risk
    }
    return '#60a5fa'; // Blue default
  };

  const getEdgeWidth = () => {
    if (data?.isOptimal) return 4;
    if (hovering) return 3;
    return 2;
  };

  const strokeColor = getEdgeColor();
  const strokeWidth = getEdgeWidth();

  return (
    <>
      {/* Animated Flow Particles */}
      {data?.isOptimal && (
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          <defs>
            <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0" />
              <stop offset="50%" stopColor={strokeColor} stopOpacity="1" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={edgePath}
            fill="none"
            stroke={`url(#gradient-${id})`}
            strokeWidth={strokeWidth + 2}
            animate={{
              strokeDashoffset: [0, 1000],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            strokeDasharray="20,10"
          />
        </svg>
      )}

      {/* Main Edge */}
      <g
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ cursor: 'pointer' }}
      >
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke: strokeColor,
            strokeWidth,
            opacity: hovering ? 1 : 0.7,
            filter: selected || hovering ? `drop-shadow(0 0 8px ${strokeColor})` : 'none',
            transition: 'all 0.2s ease',
          }}
          interactionWidth={30}
        />
      </g>

      {/* Edge Label */}
      <EdgeLabelRenderer>
        {hovering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="bg-black/90 backdrop-blur-xl border border-blue-500/50 rounded-lg px-3 py-2 text-xs text-white z-50"
          >
            <div className="font-mono font-bold mb-1">
              {data?.routeId || 'Route'}
            </div>
            {data?.cost && (
              <div className="text-green-400">
                Cost: ${data.cost.toFixed(2)}
              </div>
            )}
            {data?.eta && (
              <div className="text-blue-300">
                ETA: {data.eta} min
              </div>
            )}
            {data?.successProbability && (
              <div className="text-cyan-300">
                Success: {(data.successProbability * 100).toFixed(0)}%
              </div>
            )}
            {data?.fee && (
              <div className="text-yellow-300">
                Fee: ${data.fee.toFixed(2)}
              </div>
            )}
            {data?.lastUpdated && (
              <div className="text-gray-400 text-xs mt-1">
                {new Date(data.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </motion.div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
