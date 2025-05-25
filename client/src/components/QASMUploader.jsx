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
      
      // Basic validation
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
      setError(error.message || 'Failed to connect to server. Is the backend running?');
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

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Processing quantum circuit...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          {error.includes('connect') && (
            <p>Please ensure the backend server is running on port 5001.</p>
          )}
        </div>
      )}

      {results && (
        <div className="results-container">
          <div className="circuit-preview">
            <h3>Circuit Diagram</h3>
            <img 
              src={`data:image/png;base64,${results.circuit_image}`} 
              alt="Quantum circuit diagram"
              className="circuit-image"
            />
            <div className="circuit-stats">
              <p><strong>Qubits:</strong> {results.num_qubits}</p>
              <p><strong>Gates:</strong> {results.num_gates}</p>
            </div>
          </div>

          <div className="simulation-results">
            {results.has_measurement ? (
              <div className="measurement-results">
                <h3>Measurement Results</h3>
                <div className="counts-histogram">
                  {results.counts && (
                    <div className="histogram-bars">
                      {Object.entries(results.counts).map(([state, count]) => (
                        <div key={state} className="histogram-bar">
                          <div 
                            className="bar" 
                            style={{ height: `${(count / 1024) * 100}%` }}
                          ></div>
                          <span className="state-label">{state}</span>
                          <span className="count-label">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="state-visualization">
                <h3>Qubit States</h3>
                {results.bloch_vectors && (
                  <BlochSpheres spheres={results.bloch_vectors} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
