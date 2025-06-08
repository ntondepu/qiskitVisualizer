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
      // First try FormData approach (which your backend expects)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5001/api/upload-qasm', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Important for session/cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Server processing failed');
      }

      if (!data.circuit_image) {
        throw new Error('Server response incomplete: Missing circuit visualization');
      }

      setResults({
        ...data,
        num_qubits: data.num_qubits,
        num_gates: data.gates ? data.gates.length : 0
      });
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = error.message;
      
      if (error.message.includes('400')) {
        errorMessage = 'Invalid file format. Please upload a valid QASM file.';
      } else if (error.message.includes('No file uploaded')) {
        errorMessage = 'File upload failed. Please try again.';
      }
      
      setError(errorMessage);
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
          <button onClick={() => setError(null)}>Try Again</button>
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
              onError={() => setError('Failed to display circuit diagram')}
            />
            <div className="circuit-stats">
              <p><strong>Qubits:</strong> {results.num_qubits}</p>
              <p><strong>Gates:</strong> {results.num_gates}</p>
            </div>
          </div>

          {results.gates && (
            <div className="gate-list">
              <h4>Gate Sequence</h4>
              <ul>
                {results.gates.map((gate, index) => (
                  <li key={index}>{gate}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
