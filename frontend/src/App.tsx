import { useState, useEffect } from 'react'
import './App.css'
import type { Token, AllPairsResponse, PairData } from './types'

const API_BASE = 'http://localhost:8000'
// polling every 10 seconds for all token pairs data
const POLL_INTERVAL = 10000 

function App() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [allPairsData, setAllPairsData] = useState<AllPairsResponse | null>(null)
  const [selectedPairId, setSelectedPairId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Load tokens on mount
  useEffect(() => {
    fetch(`${API_BASE}/tokens`)
      .then(r => r.json())
      .then(data => {
        setTokens(data.tokens)
      })
      .catch(err => {
        console.error('Failed to load tokens:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

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
        
        // Set first pair as selected if none selected yet
        if (!selectedPairId && data.pairs.length > 0) {
          setSelectedPairId(data.pairs[0].pair_id)
        }
      } catch (err: any) {
        console.error('Failed to fetch pairs:', err)
        setError(err.message)
      }
    }

    // Initial fetch
    fetchAllPairs()

    // Set up polling
    const interval = setInterval(fetchAllPairs, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [selectedPairId])

  const selectedPair = allPairsData?.pairs.find(p => p.pair_id === selectedPairId)

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>PayGraph - Live Pair Data</h1>

      {loading ? (
        <p>Loading tokens...</p>
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
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '10px' }}>Select a Pair:</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                  gap: '10px' 
                }}>
                  {allPairsData.pairs.map(pair => (
                    <button
                      key={pair.pair_id}
                      onClick={() => setSelectedPairId(pair.pair_id)}
                      style={{
                        padding: '12px 15px',
                        fontSize: '14px',
                        fontWeight: selectedPairId === pair.pair_id ? 'bold' : 'normal',
                        backgroundColor: selectedPairId === pair.pair_id ? '#4CAF50' : '#f0f0f0',
                        color: selectedPairId === pair.pair_id ? 'white' : 'black',
                        border: selectedPairId === pair.pair_id ? '2px solid #2e7d32' : '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        if (selectedPairId !== pair.pair_id) {
                          e.currentTarget.style.backgroundColor = '#e0e0e0'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedPairId !== pair.pair_id) {
                          e.currentTarget.style.backgroundColor = '#f0f0f0'
                        }
                      }}
                    >
                      {pair.token0} ↔ {pair.token1}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPair && (
                <div style={{
                  backgroundColor: '#f9f9f9',
                  padding: '20px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}>
                  <h2 style={{ marginTop: '0', borderBottom: '2px solid #4CAF50', paddingBottom: '10px' }}>
                    📊 {selectedPair.token0} ↔ {selectedPair.token1} Details
                  </h2>

                  <div style={{ marginTop: '20px' }}>
                    <p><strong>✓ Pair Address Count:</strong> {selectedPair.pair_address_count}</p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px' }}>
                      📌 Pair Address
                    </h3>
                    <p style={{ 
                      fontFamily: 'monospace', 
                      backgroundColor: '#f5f5f5', 
                      padding: '10px', 
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                      fontSize: '12px'
                    }}>
                      {selectedPair.api_response.pairAddress}
                    </p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ backgroundColor: '#f3e5f5', padding: '10px', borderRadius: '4px' }}>
                      🔷 {selectedPair.api_response.token0?.symbol || 'Token 0'}
                    </h3>
                    {selectedPair.api_response.token0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', width: '30%' }}>Symbol:</td>
                            <td style={{ padding: '8px' }}>{selectedPair.api_response.token0.symbol}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Address:</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                              {selectedPair.api_response.token0.address}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Decimals:</td>
                            <td style={{ padding: '8px' }}>{selectedPair.api_response.token0.decimals}</td>
                          </tr>
                          {selectedPair.api_response.token0.name && (
                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>Name:</td>
                              <td style={{ padding: '8px' }}>{selectedPair.api_response.token0.name}</td>
                            </tr>
                          )}
                          {selectedPair.api_response.token0.total_supply_formatted && (
                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>Total Supply:</td>
                              <td style={{ padding: '8px' }}>{selectedPair.api_response.token0.total_supply_formatted}</td>
                            </tr>
                          )}
                          {selectedPair.api_response.token0.security_score !== undefined && (
                            <tr>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>Security Score:</td>
                              <td style={{ padding: '8px' }}>{selectedPair.api_response.token0.security_score}/100</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ backgroundColor: '#fce4ec', padding: '10px', borderRadius: '4px' }}>
                      🔶 {selectedPair.api_response.token1?.symbol || 'Token 1'}
                    </h3>
                    {selectedPair.api_response.token1 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', width: '30%' }}>Symbol:</td>
                            <td style={{ padding: '8px' }}>{selectedPair.api_response.token1.symbol}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Address:</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                              {selectedPair.api_response.token1.address}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Decimals:</td>
                            <td style={{ padding: '8px' }}>{selectedPair.api_response.token1.decimals}</td>
                          </tr>
                          {selectedPair.api_response.token1.name && (
                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>Name:</td>
                              <td style={{ padding: '8px' }}>{selectedPair.api_response.token1.name}</td>
                            </tr>
                          )}
                          {selectedPair.api_response.token1.total_supply_formatted && (
                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>Total Supply:</td>
                              <td style={{ padding: '8px' }}>{selectedPair.api_response.token1.total_supply_formatted}</td>
                            </tr>
                          )}
                          {selectedPair.api_response.token1.security_score !== undefined && (
                            <tr>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>Security Score:</td>
                              <td style={{ padding: '8px' }}>{selectedPair.api_response.token1.security_score}/100</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fffde7', borderRadius: '4px', border: '1px solid #fbc02d' }}>
                    <strong>💡 Raw Full Response (for debugging):</strong>
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '10px', 
                      borderRadius: '4px',
                      overflowX: 'auto',
                      fontSize: '11px',
                      marginTop: '10px'
                    }}>
                      {JSON.stringify(selectedPair, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#999' }}>No pair data available yet...</p>
          )}
        </>
      )}
    </div>
  )
}

export default App


