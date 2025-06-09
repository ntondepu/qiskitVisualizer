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
                setBackendStatus(data.status || 'healthy');
                return true;
            }
            // Error handling...
        } catch (err) {
            setBackendStatus('unreachable');
            return false;
        }
    };

    useEffect(() => {
        checkBackendHealth();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsLoading(true);
        setFileName(file.name);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('http://localhost:5001/api/upload-qasm', {
                method: 'POST',
                body: formData,
                headers: { 'Backend': selectedBackend }
            });
            
            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header Tabs */}
            <div className="flex border-b mb-6">
                <div className="px-4 py-2 font-semibold border-b-2 border-purple-600">Upload QASM</div>
                {['Build Circuit', 'Optimize', 'Noise Simulation', 'Challenges'].map((tab) => (
                    <div key={tab} className="px-4 py-2 text-gray-600">{tab}</div>
                ))}
            </div>

            {/* Upload Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold">QASM File Upload</h2>
                
                <div className="flex items-center space-x-4">
                    <div>Backend status: 
                        <span className="font-semibold ml-1">
                            {backendStatus} {backendStatus === 'healthy' && 
                                `(${availableBackends.length} backends available)`}
                        </span>
                    </div>
                    
                    <select 
                        value={selectedBackend}
                        onChange={(e) => setSelectedBackend(e.target.value)}
                        className="border rounded px-2 py-1"
                    >
                        {availableBackends.map(backend => (
                            <option key={backend} value={backend}>
                                {backend.replace('_simulator', '').toUpperCase()}
                            </option>
                        ))}
                    </select>
                    
                    <button 
                        onClick={checkBackendHealth}
                        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                        Refresh
                    </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    {fileName ? (
                        <p className="mb-2">{fileName}</p>
                    ) : (
                        <p className="mb-2">Drag & drop your QASM file here or</p>
                    )}
                    
                    <label className="inline-block">
                        <span className="px-4 py-2 bg-purple-600 text-white rounded cursor-pointer">
                            Browse Files
                        </span>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".qasm"
                            onChange={handleFileUpload}
                        />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">Supported formats: .qasm (OpenQASM 2.0)</p>
                </div>
            </div>

            {/* Results Section */}
            {results && (
                <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold">Circuit Results</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h4>Circuit Diagram</h4>
                            <img 
                                src={`data:image/png;base64,${results.circuit_image}`} 
                                alt="Circuit diagram"
                                className="border"
                            />
                        </div>
                        <div>
                            <h4>Qubit States</h4>
                            <BlochSpheres spheres={results.bloch_spheres} />
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 text-sm text-gray-500">
                <p>Quantum magic happening here</p>
                <p>Powered by Qiskit |0⟩ + |1⟩</p>
            </div>
        </div>
    );
}
