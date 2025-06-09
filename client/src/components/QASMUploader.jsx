import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';

export default function QASMUploader() {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');
    const [backendStatus, setBackendStatus] = useState('unknown');
    const [availableBackends, setAvailableBackends] = useState([]);
    const [selectedBackend, setSelectedBackend] = useState('statevector_simulator');

    const checkBackendHealth = async () => {
        try {
            const response = await fetch('http://localhost:5001/health');
            
            if (response.ok) {
                const data = await response.json();
                setAvailableBackends(data.backends || []);
                
                if (data.backends && !data.backends.includes(selectedBackend)) {
                    setSelectedBackend(data.backends[0] || 'statevector_simulator');
                }
                
                setBackendStatus(data.status || 'healthy');
                return true;
            } else {
                const errorData = await response.json();
                setBackendStatus('unhealthy');
                setError(errorData.error || 'Backend error');
                return false;
            }
        } catch (err) {
            console.error('Health check failed:', err);
            setBackendStatus('unreachable');
            setError('Failed to connect to backend server');
            return false;
        }
    };

    useEffect(() => {
        checkBackendHealth();
        const intervalId = setInterval(checkBackendHealth, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setResults(null);
        setFileName(file.name);

        try {
            const isHealthy = await checkBackendHealth();
            if (!isHealthy) {
                throw new Error(`Backend server is ${backendStatus}. Please ensure it's running on port 5001.`);
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:5001/api/upload-qasm', {
                method: 'POST',
                body: formData,
                headers: {
                    'Backend': selectedBackend
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Server processing failed');
            }

            setResults({
                ...data,
                num_qubits: data.num_qubits,
                num_gates: data.gates?.length || 0,
                bloch_spheres: data.bloch_spheres || Array(data.num_qubits).fill(null),
                backend_used: data.backend_used || selectedBackend
            });
        } catch (error) {
            console.error('Upload error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="qasm-uploader">
            <h2>QASM File Upload</h2>
            
            <div className="backend-info">
                <div className="backend-status">
                    Backend status: 
                    <span className={`status-${backendStatus}`}>
                        {backendStatus}
                        {backendStatus === 'healthy' && availableBackends.length > 0 && (
                            <span> ({availableBackends.length} backends available)</span>
                        )}
                    </span>
                </div>
                
                {availableBackends.length > 0 && (
                    <div className="backend-selector">
                        <label htmlFor="backend-select">Simulation Backend:</label>
                        <select
                            id="backend-select"
                            value={selectedBackend}
                            onChange={(e) => setSelectedBackend(e.target.value)}
                            disabled={isLoading || backendStatus !== 'healthy'}
                        >
                            {availableBackends.map(backend => (
                                <option key={backend} value={backend}>
                                    {backend.replace(/_simulator$/, '').replace(/_/g, ' ').toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <button 
                    className="refresh-btn"
                    onClick={checkBackendHealth}
                    disabled={isLoading}
                    title="Refresh backend status"
                >
                    ⟳ Refresh
                </button>
            </div>

            <div className="upload-controls">
                <label className="file-input-label">
                    <span>{fileName || 'Choose QASM file...'}</span>
                    <input
                        type="file"
                        accept=".qasm"
                        onChange={handleFileUpload}
                        disabled={isLoading || backendStatus !== 'healthy'}
                    />
                </label>
                <p className="file-hint">Supported formats: .qasm (OpenQASM 2.0)</p>
            </div>

            {isLoading && (
                <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p>Processing quantum circuit...</p>
                    <p>Using backend: {selectedBackend.replace(/_simulator$/, '').toUpperCase()}</p>
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
                    <div className="results-header">
                        <h3>Circuit Results</h3>
                        <div className="backend-used">
                            Backend used: <strong>{results.backend_used.replace(/_simulator$/, '').toUpperCase()}</strong>
                        </div>
                    </div>
                    
                    <div className="circuit-preview">
                        <h4>Circuit Diagram</h4>
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
                        <h4>Qubit States</h4>
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
