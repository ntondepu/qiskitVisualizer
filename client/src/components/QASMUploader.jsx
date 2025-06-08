import { useState } from 'react';
import BlochSpheres from './BlochSpheres';

export default function QASMUploader() {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');
    const [backendStatus, setBackendStatus] = useState('unknown');

    const checkBackendHealth = async () => {
        try {
            const response = await fetch('http://localhost:5001/health', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            setBackendStatus(response.ok ? 'healthy' : 'unhealthy');
            return response.ok;
        } catch {
            setBackendStatus('unreachable');
            return false;
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setResults(null);
        setFileName(file.name);

        try {
            // Verify backend connection first
            const isHealthy = await checkBackendHealth();
            if (!isHealthy) {
                throw new Error(`Backend server is ${backendStatus}. Please ensure it's running on port 5001.`);
            }

            // Clear any existing circuit state
            await fetch('http://localhost:5001/api/init-circuit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ num_qubits: 1 }) // Reset to minimal circuit
            });

            // Upload and process QASM file
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:5001/api/upload-qasm', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server returned status ${response.status}`);
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
                num_gates: data.gates?.length || 0,
                bloch_spheres: data.bloch_spheres || Array(data.num_qubits).fill(null)
            });
        } catch (error) {
            console.error('Upload error:', error);
            let errorMessage = error.message;

            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Connection failed. Please check:\n1. Backend is running\n2. Correct port (5001)\n3. CORS configuration\n4. Network connectivity';
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="qasm-uploader">
            <h2>QASM File Upload</h2>
            <div className="backend-status">
                Backend status: <span className={backendStatus}>{backendStatus}</span>
            </div>

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
                <p className="file-hint">Supported formats: .qasm (OpenQASM 2.0)</p>
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
                    <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
                    <div className="error-actions">
                        <button onClick={() => setError(null)}>Dismiss</button>
                        <button onClick={checkBackendHealth}>Check Backend</button>
                    </div>
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

                    <div className="quantum-state-visualization">
                        <h3>Qubit States</h3>
                        <BlochSpheres
                            spheres={results.bloch_spheres}
                            numQubits={results.num_qubits}
                        />
                    </div>

                    {results.gates && (
                        <div className="gate-list">
                            <h4>Gate Sequence</h4>
                            <ul>
                                {results.gates.map((gate, index) => (
                                    <li key={`gate-${index}`}>
                                        <span className="gate-index">{index + 1}.</span>
                                        <span className="gate-name">{gate}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
