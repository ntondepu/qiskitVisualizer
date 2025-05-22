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
      const qasmText = await file.text()
      const response = await fetch('http://localhost:5001/api/upload-qasm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qasm: qasmText })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server responded with ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Unknown error')
      setResults(data)
      
    } catch (err) {
      setError(err.message)
      console.error("Upload error:", err)
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
      />
      
      {isLoading && <div className="loading">Processing...</div>}
      
      {error && (
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {results && (
        <div className="results">
          <h3>Circuit Diagram</h3>
          <img 
            src={`data:image/png;base64,${results.circuit_image}`} 
            alt="Quantum circuit" 
            style={{ maxWidth: '100%' }}
          />
          <div className="stats">
            <p>Qubits: {results.num_qubits}</p>
            <p>Gates: {results.num_gates}</p>
          </div>
          {results.has_measurement ? (
            <div>
              <h3>Measurements</h3>
              <pre>{JSON.stringify(results.counts, null, 2)}</pre>
            </div>
          ) : (
            <div>
              <h3>Qubit States</h3>
              <pre>{JSON.stringify(results.bloch_vectors, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
