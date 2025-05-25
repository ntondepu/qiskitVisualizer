import { useState } from 'react';
import BlochSpheres from './BlochSpheres';

export default function QASMUploader() {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setFileName(file.name);

    try {
      const qasmText = await file.text();
      
      if (!qasmText.trim().startsWith('OPENQASM')) {
        throw new Error('Invalid QASM file format');
      }

      const response = await fetch('http://localhost:5001/api/upload-qasm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qasm: qasmText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      setResults(data);
    } catch (error) {
      console.error('QASM upload error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="qasm-uploader">
      <h2>QASM File Upload</h2>
      
      <div className="upload-controls">
        <label className="file-input-label">
          <span>{fileName || 'Choose QASM file...'}</span>
          <input 
            type="file" 
            accept=".qasm" 
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {results && (
        <div className="results">
          <div className="circuit-preview">
            <h3>Circuit Diagram</h3>
            <img 
              src={`data:image/png;base64,${results.circuit_image}`} 
              alt="Quantum circuit"
            />
            <div className="stats">
              <p>Qubits: {results.num_qubits}</p>
              <p>Gates: {results.num_gates}</p>
            </div>
          </div>
          <div className="visualization">
            {results.has_measurement ? (
              <div className="histogram">
                <h3>Measurements</h3>
                {results.counts && (
                  <div className="bars">
                    {Object.entries(results.counts).map(([state, count]) => (
                      <div key={state} className="bar-container">
                        <div className="bar" style={{ height: `${(count/1024)*100}%` }}></div>
                        <span>{state}: {count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bloch-spheres">
                <h3>Qubit States</h3>
                <BlochSpheres spheres={results.bloch_vectors} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
