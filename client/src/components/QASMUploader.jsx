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
      
      // Client-side validation
      if (!qasmText.trim().startsWith('OPENQASM')) {
        throw new Error('This doesn\'t appear to be a valid QASM file. QASM files should start with "OPENQASM".');
      }

      const response = await fetch('http://localhost:5001/api/upload-qasm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qasm: qasmText })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'The server encountered an error processing your file');
      }

      if (!data.circuit_image) {
        throw new Error('The server didn\'t return a circuit visualization');
      }

      setResults(data);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'An unknown error occurred during upload');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="qasm-uploader">
      <h2>Quantum Circuit Upload</h2>
      <p className="upload-instructions">
        Upload any valid OpenQASM 2.0 file to visualize the quantum circuit and see simulation results.
      </p>
      
      <div className="upload-area">
        <label className="file-upload-label">
          <input 
            type="file" 
            accept=".qasm" 
            onChange={handleFileUpload}
            disabled={isLoading}
          />
          <div className="file-upload-box">
            {fileName ? (
              <span className="file-name">{fileName}</span>
            ) : (
              <>
                <span className="upload-icon">📁</span>
                <span>Choose QASM file or drag here</span>
              </>
            )}
          </div>
        </label>
      </div>

      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing quantum circuit...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <h3>Oops!</h3>
          <p>{error}</p>
          <button 
            className="try-again-button"
            onClick={() => setError(null)}
          >
            Try Again
          </button>
        </div>
      )}

      {results && (
        <div className="results-view">
          <div className="circuit-section">
            <h3>Circuit Visualization</h3>
            <img 
              src={`data:image/png;base64,${results.circuit_image}`} 
              alt="Generated quantum circuit"
              onError={() => setError('Failed to display circuit diagram')}
            />
            <div className="circuit-meta">
              <p><strong>Qubits:</strong> {results.num_qubits}</p>
              <p><strong>Operations:</strong> {results.num_gates}</p>
            </div>
          </div>

          <div className="simulation-section">
            {results.has_measurement ? (
              <>
                <h3>Measurement Outcomes</h3>
                <div className="probability-distribution">
                  {Object.entries(results.counts || {}).map(([state, count]) => (
                    <div key={state} className="state-probability">
                      <div className="probability-bar" style={{ width: `${(count / 1024) * 100}%` }} />
                      <span className="state-value">{state}</span>
                      <span className="state-count">{count} shots</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3>Qubit States</h3>
                <BlochSpheres spheres={results.bloch_vectors || []} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
