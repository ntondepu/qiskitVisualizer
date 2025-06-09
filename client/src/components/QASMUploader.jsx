import { useState, useEffect } from 'react';
import { FaUpload, FaMicrochip, FaBolt, FaRobot, FaGamepad, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import BlochSpheres from './BlochSpheres';
import ParticleBackground from './ParticleBackground'; // You can implement this separately

export default function QASMUploader() {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');
    const [backendStatus, setBackendStatus] = useState('unknown');
    const [availableBackends, setAvailableBackends] = useState([]);
    const [selectedBackend, setSelectedBackend] = useState('statevector_simulator');
    const [isDragging, setIsDragging] = useState(false);

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

    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) {
            handleFileUpload({ target: { files: e.dataTransfer.files } });
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0] || event.dataTransfer?.files?.[0];
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

    const getStatusColor = () => {
        switch(backendStatus) {
            case 'healthy': return 'text-green-400';
            case 'unhealthy': return 'text-yellow-400';
            case 'unreachable': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = () => {
        switch(backendStatus) {
            case 'healthy': return <FaCheckCircle className="text-green-500 animate-pulse" />;
            case 'unhealthy': return <FaExclamationTriangle className="text-yellow-500" />;
            case 'unreachable': return <FaExclamationTriangle className="text-red-500" />;
            default: return <FaSpinner className="text-gray-500 animate-spin" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white p-6">
            <ParticleBackground />
            <div className="max-w-6xl mx-auto">
                {/* Animated Header Tabs */}
                <div className="flex space-x-1 mb-8 overflow-x-auto pb-2">
                    {['Upload QASM', 'Build Circuit', 'Optimize', 'Noise Simulation', 'Challenges'].map((tab, index) => (
                        <button
                            key={index}
                            className={`px-4 py-3 rounded-t-lg font-medium flex items-center transition-all ${
                                index === 0 
                                    ? 'bg-purple-600 shadow-lg'
                                    : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                        >
                            {index === 0 && <FaUpload className="mr-2" />}
                            {index === 1 && <FaMicrochip className="mr-2" />}
                            {index === 2 && <FaBolt className="mr-2" />}
                            {index === 3 && <FaRobot className="mr-2" />}
                            {index === 4 && <FaGamepad className="mr-2" />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-gray-800 bg-opacity-70 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-purple-500">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <FaUpload className="mr-3 text-purple-300" />
                        QASM File Upload
                    </h2>

                    {/* Backend Status Panel */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 p-3 bg-gray-900 rounded-lg space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                            {getStatusIcon()}
                            <span>Backend status: 
                                <span className={`font-bold ml-1 ${getStatusColor()}`}>
                                    {backendStatus}
                                    {backendStatus === 'healthy' && availableBackends.length > 0 && (
                                        <span className="text-gray-400"> ({availableBackends.length} backends available)</span>
                                    )}
                                </span>
                            </span>
                        </div>
                        
                        <div className="flex items-center space-x-3 w-full sm:w-auto">
                            {availableBackends.length > 0 && (
                                <select
                                    value={selectedBackend}
                                    onChange={(e) => setSelectedBackend(e.target.value)}
                                    disabled={isLoading || backendStatus !== 'healthy'}
                                    className="flex-grow sm:flex-grow-0 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {availableBackends.map(backend => (
                                        <option key={backend} value={backend}>
                                            {backend.replace(/_simulator$/, '').replace(/_/g, ' ').toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            )}
                            
                            <button 
                                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm flex items-center transition-colors disabled:opacity-50"
                                onClick={checkBackendHealth}
                                disabled={isLoading}
                                title="Refresh backend status"
                            >
                                <FaSync className="mr-1" /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Interactive Upload Zone */}
                    <div 
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                            isDragging ? 'border-purple-400 bg-purple-900 bg-opacity-30' : 'border-gray-600'
                        } ${(isLoading || backendStatus !== 'healthy') ? 'opacity-50 pointer-events-none' : ''}`}
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center space-y-4">
                            {isLoading ? (
                                <>
                                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-lg font-medium">Processing quantum circuit...</p>
                                    <p className="text-gray-400">Using backend: {selectedBackend.replace(/_simulator$/, '').toUpperCase()}</p>
                                </>
                            ) : error ? (
                                <>
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                        <FaExclamationTriangle className="text-2xl" />
                                    </div>
                                    <p className="text-lg font-medium text-red-400">Upload Error</p>
                                    <p className="text-gray-400 whitespace-pre-line">{error}</p>
                                    <div className="flex space-x-3">
                                        <button 
                                            onClick={() => setError(null)}
                                            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                        <button 
                                            onClick={checkBackendHealth}
                                            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
                                        >
                                            Check Backend
                                        </button>
                                    </div>
                                </>
                            ) : fileName ? (
                                <>
                                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center animate-pulse">
                                        <FaCheckCircle className="text-2xl" />
                                    </div>
                                    <p className="text-lg font-medium">{fileName}</p>
                                    <p className="text-gray-400">File ready for processing</p>
                                    <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium inline-block transition-colors">
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept=".qasm"
                                            onChange={handleFileUpload}
                                        />
                                        Choose Different File
                                    </label>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                                        <FaUpload className="text-2xl" />
                                    </div>
                                    
                                    <p className="text-xl font-medium">Drag & drop your QASM file here</p>
                                    <p className="text-gray-400">or</p>
                                    
                                    <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium inline-block transition-colors">
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept=".qasm"
                                            onChange={handleFileUpload}
                                        />
                                        Browse Files
                                    </label>
                                </>
                            )}
                            
                            <p className="text-sm text-gray-400 mt-2">
                                Supported formats: .qasm (OpenQASM 2.0)
                            </p>
                        </div>
                    </div>

                    {/* Results Display */}
                    {results && (
                        <div className="mt-8 bg-gray-900 bg-opacity-50 rounded-xl p-6 border border-purple-500">
                            <div className="results-header mb-6">
                                <h3 className="text-xl font-bold flex items-center">
                                    <FaMicrochip className="mr-2 text-purple-300" />
                                    Circuit Results
                                </h3>
                                <div className="text-sm text-gray-400 mt-1">
                                    Backend used: <strong className="text-purple-300">{results.backend_used.replace(/_simulator$/, '').toUpperCase()}</strong>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="circuit-preview bg-gray-800 p-4 rounded-lg">
                                    <h4 className="font-medium mb-3 flex items-center">
                                        <FaBolt className="mr-2 text-yellow-400" />
                                        Circuit Diagram
                                    </h4>
                                    <img
                                        src={`data:image/png;base64,${results.circuit_image}`}
                                        alt="Quantum circuit diagram"
                                        className="w-full h-auto rounded border border-gray-700"
                                        onError={() => setError('Failed to display circuit diagram')}
                                    />
                                    <div className="circuit-stats flex space-x-4 mt-3 text-sm">
                                        <p><strong className="text-purple-300">Qubits:</strong> {results.num_qubits}</p>
                                        <p><strong className="text-purple-300">Gates:</strong> {results.num_gates}</p>
                                    </div>
                                </div>

                                <div className="quantum-state-visualization bg-gray-800 p-4 rounded-lg">
                                    <h4 className="font-medium mb-3 flex items-center">
                                        <FaRobot className="mr-2 text-blue-400" />
                                        Qubit States
                                    </h4>
                                    <BlochSpheres
                                        spheres={results.bloch_spheres}
                                        numQubits={results.num_qubits}
                                    />
                                </div>
                            </div>

                            {results.gates && (
                                <div className="gate-list mt-6 bg-gray-800 p-4 rounded-lg">
                                    <h4 className="font-medium mb-3 flex items-center">
                                        <FaGamepad className="mr-2 text-green-400" />
                                        Gate Sequence
                                    </h4>
                                    <div className="max-h-60 overflow-y-auto pr-2">
                                        <ul className="space-y-1">
                                            {results.gates.map((gate, index) => (
                                                <li key={`gate-${index}`} className="flex items-center py-1 px-2 hover:bg-gray-700 rounded transition-colors">
                                                    <span className="text-gray-400 w-8">{index + 1}.</span>
                                                    <span className="font-mono">{gate}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row justify-between mt-6 opacity-70 text-xs">
                        <div className="text-gray-400 flex items-center mb-2 sm:mb-0">
                            <span className="animate-pulse mr-1">⚛️</span> Quantum magic happening here
                        </div>
                        <div className="text-gray-400">
                            Powered by Qiskit <span className="text-purple-300">|0⟩ + |1⟩</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
