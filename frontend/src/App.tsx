import { useState, useEffect } from 'react'
import './App.css'

interface Token {
  symbol: string
  address: string
  decimals: number
  logo_url?: string
}

const API_BASE = 'http://localhost:8000'

function App() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [fromToken, setFromToken] = useState<string>('')
  const [toToken, setToToken] = useState<string>('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Load tokens on mount
  useEffect(() => {
    fetch(`${API_BASE}/tokens`)
      .then(r => r.json())
      .then(data => {
        setTokens(data.tokens)
        if (data.tokens.length > 0) {
          setFromToken(data.tokens[0].symbol)
          if (data.tokens.length > 1) setToToken(data.tokens[1].symbol)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleFetch = async () => {
    if (!fromToken || !toToken) return
    if (fromToken === toToken) {
      setError('Tokens must be different')
      return
    }

    setFetching(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/pairs/${fromToken}/${toToken}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
      setResponse(data)
    } catch (err: any) {
      setError(err.message)
      setResponse(null)
    } finally {
      setFetching(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px' }}>
      <h1>💰 PayGraph - Pair Data Fetcher</h1>

      {loading ? (
        <p>Loading tokens...</p>
      ) : (
        <>
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)} style={{ padding: '5px', fontSize: '14px' }}>
              {tokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
            <span style={{ margin: '0 10px', fontWeight: 'bold' }}>→</span>
            <select value={toToken} onChange={(e) => setToToken(e.target.value)} style={{ padding: '5px', fontSize: '14px' }}>
              {tokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
            <button 
              onClick={handleFetch} 
              disabled={fetching} 
              style={{ 
                marginLeft: '10px',
                padding: '5px 15px',
                backgroundColor: fetching ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: fetching ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {fetching ? 'Fetching...' : 'Fetch Pair Data'}
            </button>
          </div>

          {error && (
            <div style={{ 
              color: '#d32f2f', 
              backgroundColor: '#ffebee', 
              padding: '12px', 
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #ef5350'
            }}>
              ❌ Error: {error}
            </div>
          )}

          {response && (
            <div>
              <h2 style={{ marginTop: '30px', borderBottom: '2px solid #4CAF50', paddingBottom: '10px' }}>
                📊 Pair Data Result
              </h2>
              
              <div style={{ marginTop: '20px' }}>
                <p><strong>✓ Pair Address Count:</strong> {response.pair_address_count}</p>
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3 style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px' }}>
                  📌 Pair Address
                </h3>
                <p style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px',
                  wordBreak: 'break-all'
                }}>
                  {response.api_response.pairAddress}
                </p>
              </div>

              <div style={{ marginTop: '20px' }}>
                <h3 style={{ backgroundColor: '#f3e5f5', padding: '10px', borderRadius: '4px' }}>
                  🔷 Token 0
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', width: '30%' }}>Symbol:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token0.symbol}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Address:</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                        {response.api_response.token0.address}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Decimals:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token0.decimals}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Name:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token0.name}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Total Supply:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token0.total_supply_formatted}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Security Score:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token0.security_score}/100</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px' }}>
                <h3 style={{ backgroundColor: '#fce4ec', padding: '10px', borderRadius: '4px' }}>
                  🔶 Token 1
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', width: '30%' }}>Symbol:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token1.symbol}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Address:</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                        {response.api_response.token1.address}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Decimals:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token1.decimals}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Name:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token1.name}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Total Supply:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token1.total_supply_formatted}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Security Score:</td>
                      <td style={{ padding: '8px' }}>{response.api_response.token1.security_score}/100</td>
                    </tr>
                  </tbody>
                </table>
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
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App


