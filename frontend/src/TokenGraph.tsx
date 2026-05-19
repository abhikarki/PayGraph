import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import './TokenGraph.css'
import type { PairData } from './types'

interface TokenGraphProps {
  pairs: PairData[]
}

export function TokenGraph({ pairs }: TokenGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  useEffect(() => {
    if (!containerRef.current || pairs.length === 0) return

    // Build node and edge lists from pairs data
    const nodesMap = new Map<string, { id: string; label: string }>()
    const edges: cytoscape.ElementDefinition[] = []

    // Collect all tokens as nodes
    pairs.forEach(pair => {
      if (!nodesMap.has(pair.token0)) {
        nodesMap.set(pair.token0, { id: pair.token0, label: pair.token0 })
      }
      if (!nodesMap.has(pair.token1)) {
        nodesMap.set(pair.token1, { id: pair.token1, label: pair.token1 })
      }

      // Extract pair address count as edge weight
      const edgeId = `${pair.token0}-${pair.token1}`
      const value = pair.pair_address_count || 0

      edges.push({
        data: {
          id: edgeId,
          source: pair.token0,
          target: pair.token1,
          label: value.toString(),
          value: value,
        },
      })
    })

    // Convert nodes map to array
    const nodes: cytoscape.ElementDefinition[] = Array.from(nodesMap.values()).map(node => ({
      data: {
        id: node.id,
        label: node.label,
      },
    }))

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            content: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#4CAF50',
            color: 'white',
            'font-size': '14px',
            'font-weight': 'bold',
            width: '60px',
            height: '60px',
            'border-width': '2px',
            'border-color': '#2e7d32',
            padding: '10px',
          },
        },
        {
          selector: 'node:hover',
          style: {
            'background-color': '#45a049',
            'border-color': '#1b5e20',
            'border-width': '3px',
          },
        },
        {
          selector: 'edge',
          style: {
            content: 'data(label)',
            'line-color': '#90caf9',
            'target-arrow-color': '#90caf9',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.5,
            'edge-distances': 'node-position',
            'curve-style': 'bezier',
            'text-background-color': '#fff',
            'text-background-padding': '3px',
            'text-background-opacity': 1,
            'font-size': '12px',
            'text-valign': 'center',
            'color': '#333',
            'width': '2px',
          },
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': '#42a5f5',
            'target-arrow-color': '#42a5f5',
            width: '3px',
            'text-background-color': '#e3f2fd',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        randomize: false,
        componentSpacing: 40,
        gravity: 1,
      },
    })

    cyRef.current = cy

    // Auto-layout on window resize
    const handleResize = () => {
      cy.resize()
      cy.fit()
    }

    window.addEventListener('resize', handleResize)

    // Fit to view
    setTimeout(() => {
      cy.fit()
    }, 500)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [pairs])

  return (
    <div className="token-graph-container">
      <div className="token-graph-info">
        <p>📊 Token Pair Graph - Edges show pair address count</p>
      </div>
      <div ref={containerRef} className="token-graph" />
    </div>
  )
}
