import { useState, useEffect } from 'react'
import './App.css'
import { TokenGraph } from './TokenGraph'
import type { AllPairsResponse } from './types'

const API_BASE = 'http://localhost:8000'
// polling every 10 seconds for all token pairs data
const POLL_INTERVAL = 10000 

function App() {
  const [allPairsData, setAllPairsData] = useState<AllPairsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Poll all pairs data every 10 seconds
  useEffect(() => {
    const fetchAllPairs = async () => {
      try {
        setError(null)
        const res = await fetch(`${API_BASE}/pairs/all`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.detail || `HTTP ${res.status}`)
        }
        const data: AllPairsResponse = await res.json()
        setAllPairsData(data)
        setLastUpdated(new Date(data.timestamp).toLocaleTimeString())
        setLoading(false)
      } catch (err: any) {
        console.error('Failed to fetch pairs:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    // Initial fetch
    fetchAllPairs()

    // Set up polling
    const interval = setInterval(fetchAllPairs, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>PayGraph - Live Token Pair Graph</h1>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <>
          {error && (
            <div style={{ 
              color: '#d32f2f', 
              backgroundColor: '#ffebee', 
              padding: '12px', 
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #ef5350'
            }}>
              Error: {error}
            </div>
          )}

          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #90caf9'
          }}>
            <p style={{ margin: '0' }}>
              <strong>📡 Auto-updating every 10 seconds</strong><br/>
              Last update: {lastUpdated}
            </p>
          </div>

          {allPairsData && allPairsData.pairs.length > 0 ? (
            <>
              <TokenGraph pairs={allPairsData.pairs} />
              
              <div style={{ 
                backgroundColor: '#f9f9f9', 
                padding: '15px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '14px',
                color: '#666'
              }}>
                <strong>Graph Info:</strong> {allPairsData.pairs.length} pairs loaded
                {' | '}
                Nodes: tokens | Edges: pair relationships (labeled with pair address count)
              </div>
            </>
          ) : (
            <p style={{ color: '#666' }}>No pair data available</p>
          )}
        </>
      )}
    </div>
  )
}

export default App
