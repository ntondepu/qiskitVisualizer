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
    
    try {
      const qasmText = await file.text()
      const response = await fetch('/api/upload-qasm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qasm: qasmText })
      })
      
      if (!response.ok) {
        throw new Error(await response.text())
      }
      
      setResults(await response.json())
    } catch (err) {
      setError(err.message)
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
      
      {isLoading && <p>Processing quantum circuit...</p>}
      {error && <p className="error">Error: {error}</p>}
      
      {results && (
        <div className="results">
          <h3>Circuit Diagram</h3>
          <img 
            src={`data:image/png;base64,${results.circuit_image}`} 
            alt="Quantum circuit"
          />
          
          <div className="stats">
            <p>Qubits: {results.num_qubits}</p>
            <p>Gates: {results.num_gates}</p>
          </div>
          
          {results.has_measurement ? (
            <div className="measurement-results">
              <h3>Measurement Results</h3>
              {/* Add chart visualization here */}
            </div>
          ) : (
            <div className="bloch-spheres">
              <h3>Qubit States</h3>
              {/* Add Bloch sphere visualization here */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
