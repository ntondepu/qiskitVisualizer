import { useState } from 'react';
import BlochSpheres from './BlochSpheres';

function QASMUploader() {
  const [file, setFile] = useState(null);
  const [circuitImage, setCircuitImage] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError('');
    setResults(null);
    setCircuitImage('');

    try {
      // First approach: Send as FormData
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5001/api/upload-qasm', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      
      // If we get circuit image directly
      if (data.circuit_image) {
        setCircuitImage(`data:image/png;base64,${data.circuit_image}`);
      } 
      // If we get full results
      else if (data.success) {
        setResults(data);
        if (data.circuit_image) {
          setCircuitImage(`data:image/png;base64,${data.circuit_image}`);
        }
      } else {
        // Second approach: Try sending as text if first fails
        const qasmText = await file.text();
        
        // Basic validation
        if (!qasmText.trim().startsWith('OPENQASM')) {
          throw new Error('Invalid QASM file format');
        }

        const textResponse = await fetch('http://localhost:5001/api/upload-qasm', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ qasm: qasmText })
        });

        if (!textResponse.ok) {
          const errorData = await textResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${textResponse.status}`);
        }

        const textData = await textResponse.json();
        if (!textData.success) {
          throw new Error(textData.error || 'Unknown error occurred');
        }

        setResults(textData);
        if (textData.circuit_image) {
          setCircuitImage(`data:image/png;base64,${textData.circuit_image}`);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to connect to server. Is the backend running?');
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
            accept=".qasm,.pdf" 
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </label>
        <button 
          onClick={handleUpload} 
          disabled={!file || isLoading}
          className="upload-button"
        >
          {isLoading ? 'Processing...' : 'Upload'}
        </button>
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

      {(circuitImage || results) && (
        <div className="results-container">
          <div className="circuit-preview">
            <h3>Circuit Diagram</h3>
            <img 
              src={circuitImage || `data:image/png;base64,${results?.circuit_image}`} 
              alt="Quantum circuit diagram"
              className="circuit-image"
              onError={() => setError('Failed to display circuit')}
            />
            {results && (
              <div className="circuit-stats">
                <p><strong>Qubits:</strong> {results.num_qubits}</p>
                <p><strong>Gates:</strong> {results.num_gates}</p>
              </div>
            )}
          </div>

          {results && (
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
          )}
        </div>
      )}
    </div>
  );
}

export default QASMUploader;
