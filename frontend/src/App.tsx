import { useState, useEffect } from 'react'
import './App.css'
import { TokenGraph } from './TokenGraph'
import type { AllPairsResponse, PairData } from './types'

const API_BASE = 'http://localhost:8000'
const POLL_INTERVAL = 10000 

function App() {
  const [allPairsData, setAllPairsData] = useState<AllPairsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [selectedPair, setSelectedPair] = useState<PairData | null>(null)

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
        console.log('API Response:', data)
        setAllPairsData(data)
        setLastUpdated(new Date(data.timestamp).toLocaleTimeString())
        setLoading(false)
      } catch (err: any) {
        console.error('Failed to fetch pairs:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchAllPairs()
    const interval = setInterval(fetchAllPairs, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <>
      <header className="app-header">
        <h1>PayGraph</h1>
      </header>

      <main className="graph-section">
        {error && <div className="error-banner">{error}</div>}
        {allPairsData && allPairsData.pairs.length > 0 ? (
          <>
            <TokenGraph pairs={allPairsData.pairs} onEdgeClick={setSelectedPair} />
            {selectedPair && (
              <div className="details-popup">
                <div className="popup-header">
                  <h2>{selectedPair.pair_id}</h2>
                  <button className="close-btn" onClick={() => setSelectedPair(null)}>×</button>
                </div>
                
                <div className="popup-content">
                  <section className="popup-section">
                    <h3>Pair Info</h3>
                    <div className="info-row">
                      <label>Pair ID:</label>
                      <span>{selectedPair.pair_id}</span>
                    </div>
                    <div className="info-row">
                      <label>Addresses:</label>
                      <span>{selectedPair.pair_address_count}</span>
                    </div>
                  </section>

                  <section className="popup-section">
                    <h3>Metrics</h3>
                    <div className="info-row">
                      <label>Liquidity:</label>
                      <span>{selectedPair.metrics?.liquidity_score || 0}</span>
                    </div>
                    <div className="info-row">
                      <label>Slippage (1%):</label>
                      <span>{(selectedPair.metrics?.estimated_slippage_1pct || 0).toFixed(3)}%</span>
                    </div>
                    <div className="info-row">
                      <label>Price Impact (1%):</label>
                      <span>{(selectedPair.metrics?.price_impact_1pct || 0).toFixed(6)}%</span>
                    </div>
                  </section>

                  <section className="popup-section">
                    <h3>Token 1: {selectedPair.token0}</h3>
                    {selectedPair.api_response?.token0 && (
                      <>
                        <div className="info-row small">
                          <label>Address:</label>
                          <span className="address">{selectedPair.api_response.token0.address?.slice(0, 10)}...</span>
                        </div>
                        <div className="info-row small">
                          <label>Decimals:</label>
                          <span>{selectedPair.api_response.token0.decimals}</span>
                        </div>
                        {selectedPair.api_response.token0.usdPrice && (
                          <div className="info-row small">
                            <label>USD Price:</label>
                            <span>${selectedPair.api_response.token0.usdPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </section>

                  <section className="popup-section">
                    <h3>Token 2: {selectedPair.token1}</h3>
                    {selectedPair.api_response?.token1 && (
                      <>
                        <div className="info-row small">
                          <label>Address:</label>
                          <span className="address">{selectedPair.api_response.token1.address?.slice(0, 10)}...</span>
                        </div>
                        <div className="info-row small">
                          <label>Decimals:</label>
                          <span>{selectedPair.api_response.token1.decimals}</span>
                        </div>
                        {selectedPair.api_response.token1.usdPrice && (
                          <div className="info-row small">
                            <label>USD Price:</label>
                            <span>${selectedPair.api_response.token1.usdPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </section>

                  {selectedPair.api_response?.pairAddress && (
                    <section className="popup-section">
                      <h3>Pair Address</h3>
                      <div className="pair-address">{selectedPair.api_response.pairAddress}</div>
                    </section>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-data">No pair data available</div>
        )}
      </main>

      <footer className="app-footer">
        📡 Auto-updating every 10 seconds | Last update: {lastUpdated}
      </footer>
    </>
  )
}

export default App
