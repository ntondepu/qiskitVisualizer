import { useState } from 'react'

export default function QASMUploader() {
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setResults(null)
    
    try {
      console.log("File selected:", file.name)
      const qasmText = await file.text()
      console.log("QASM content (first 100 chars):", qasmText.substring(0, 100))
      
      const response = await fetch('http://localhost:5000/api/upload-qasm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qasm: qasmText })
      })
      
      console.log("Response status:", response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }
      
      const data = await response.json()
      console.log("API response data:", data)
      setResults(data)
      
    } catch (err) {
      console.error("Upload error:", err)
      setError(err.message || 'Failed to process QASM file')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="uploader">
      <h2>Upload QASM File</h2>
      <input 
        type="file" 
        accept=".qasm" 
        onChange={handleFileUpload}
        disabled={isLoading}
        style={{ display: 'block', margin: '10px 0' }}
      />
      
      {isLoading && (
        <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
          Processing quantum circuit...
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: '10px',
          background: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          margin: '10px 0',
          color: '#d32f2f'
        }}>
          <strong>Error:</strong> {error}
          <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
            Check browser console (F12) for details
          </div>
        </div>
      )}
      
      {results && (
        <div className="results" style={{ marginTop: '20px' }}>
          <h3>Circuit Diagram</h3>
          {results.circuit_image ? (
            <img 
              src={`data:image/png;base64,${results.circuit_image}`} 
              alt="Quantum circuit"
              style={{ 
                maxWidth: '100%', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                margin: '10px 0'
              }}
            />
          ) : (
            <p>No circuit image available</p>
          )}
          
          <div className="stats" style={{ display: 'flex', gap: '20px' }}>
            <p><strong>Qubits:</strong> {results.num_qubits || 'N/A'}</p>
            <p><strong>Gates:</strong> {results.num_gates || 'N/A'}</p>
          </div>
          
          {results.has_measurement ? (
            <div className="measurement-results">
              <h3>Measurement Results</h3>
              {results.counts ? (
                <pre style={{ 
                  background: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(results.counts, null, 2)}
                </pre>
              ) : (
                <p>No measurement results</p>
              )}
            </div>
          ) : (
            <div className="bloch-spheres">
              <h3>Qubit States</h3>
              {results.bloch_vectors ? (
                <pre style={{ 
                  background: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(results.bloch_vectors, null, 2)}
                </pre>
              ) : (
                <p>No state vector results</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
