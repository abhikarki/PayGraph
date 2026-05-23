import { useState, useEffect } from 'react'
import './App.css'
import { TokenGraph } from './TokenGraph'
import type { AllPairsResponse } from './types'

const API_BASE = 'http://localhost:8000'
const POLL_INTERVAL = 10000 

function App() {
  const [allPairsData, setAllPairsData] = useState<AllPairsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

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
    <div className="app-wrapper">
      <header className="app-header">
        <h1>PayGraph</h1>
      </header>

      <main className="app-content">
        {error && <div className="error-banner">{error}</div>}
        {allPairsData && allPairsData.pairs.length > 0 ? (
          <TokenGraph pairs={allPairsData.pairs} />
        ) : (
          <div className="no-data">No pair data available</div>
        )}
      </main>

      <footer className="app-footer">
        📡 Auto-updating every 10 seconds | Last update: {lastUpdated}
      </footer>
    </div>
  )
}

export default App
