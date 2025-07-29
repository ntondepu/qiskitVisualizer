import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';
import BlochSphere3D from './BlochSphere3D';
import CircuitAnimator from './CircuitAnimator';
import AdvancedNoiseModeling from './AdvancedNoiseModeling';
import IBMQuantumIntegration from './IBMQuantumIntegration';
import ResultsViewer from './ResultsViewer';
import { FaPlay, FaRedo, FaDownload, FaCog, FaPlus, FaTrash, FaUpload, FaCube, FaRocket, FaFilm, FaAtom } from 'react-icons/fa';

export default function CircuitBuilder({ onCircuitUpdate }) {
    const [numQubits, setNumQubits] = useState(2);
    const [gates, setGates] = useState([]);
    const [results, setResults] = useState(null);
    const [blochSpheres, setBlochSpheres] = useState([]);
    const [circuitImage, setCircuitImage] = useState('');
    const [selectedGate, setSelectedGate] = useState('h');
    const [targetQubit, setTargetQubit] = useState(0);
    const [controlQubit, setControlQubit] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    
    // Advanced features state
    const [activeFeature, setActiveFeature] = useState('standard');
    const [use3DVisualization, setUse3DVisualization] = useState(false);
    const [enableAnimation, setEnableAnimation] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [noiseModel, setNoiseModel] = useState(null);
    const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);

    const features = [
        {
            id: 'standard',
            name: 'Standard Mode',
            icon: <FaCog />,
            description: 'Classic circuit building experience',
            color: '#646cff'
        },
        {
            id: '3d-visualization',
            name: '3D Visualization',
            icon: <FaCube />,
            description: 'Interactive 3D Bloch spheres',
            color: '#2ecc71'
        },
        {
            id: 'hardware-integration',
            name: 'Hardware Integration',
            icon: <FaRocket />,
            description: 'Connect to quantum computers',
            color: '#e74c3c'
        },
        {
            id: 'circuit-animation',
            name: 'Circuit Animation',
            icon: <FaFilm />,
            description: 'Step-by-step execution',
            color: '#f39c12'
        },
        {
            id: 'noise-modeling',
            name: 'Noise Modeling',
            icon: <FaAtom />,
            description: 'Realistic error simulation',
            color: '#9b59b6'
        }
    ];

    const availableGates = [
        { id: 'h', name: 'Hadamard', symbol: 'H', description: 'Creates superposition', color: '#ff6b6b' },
        { id: 'x', name: 'Pauli-X', symbol: 'X', description: 'Bit flip gate', color: '#4ecdc4' },
        { id: 'y', name: 'Pauli-Y', symbol: 'Y', description: 'Y rotation', color: '#45b7d1' },
        { id: 'z', name: 'Pauli-Z', symbol: 'Z', description: 'Phase flip gate', color: '#96ceb4' },
        { id: 's', name: 'S Gate', symbol: 'S', description: 'Phase gate', color: '#ffeaa7' },
        { id: 't', name: 'T Gate', symbol: 'T', description: 'π/8 phase gate', color: '#dda0dd' },
        { id: 'cx', name: 'CNOT', symbol: '⊕', description: 'Controlled NOT', color: '#ff7675', twoQubit: true },
        { id: 'cz', name: 'Controlled-Z', symbol: 'CZ', description: 'Controlled Z', color: '#74b9ff', twoQubit: true },
        { id: 'swap', name: 'SWAP', symbol: '×', description: 'Swap qubits', color: '#fd79a8', twoQubit: true }
    ];

    const handleNumQubitsChange = (e) => {
        const value = parseInt(e.target.value) || 2;
        setNumQubits(Math.max(1, Math.min(10, value)));
    };

    const initializeCircuit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('🔄 Initializing circuit with', numQubits, 'qubits');
            
            const response = await fetch('/api/init-circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ num_qubits: numQubits })
            });

            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ API Error:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to initialize circuit`);
            }

            const data = await response.json();
            console.log('✅ API Response data:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Circuit initialization failed');
            }

            // Reset circuit state
            setGates([]);
            setResults(null);
            setBlochSpheres(data.bloch_spheres || []);
            setCircuitImage(data.circuit_image || '');
            
            console.log('🎉 Circuit initialized successfully');
            console.log('📊 Bloch spheres:', data.bloch_spheres?.length || 0);
            console.log('🎨 Circuit image:', data.circuit_image ? 'Present' : 'None');
            
            // Test the circuit immediately to verify it works
            console.log('🧪 Testing circuit functionality...');
            
            if (onCircuitUpdate) {
                onCircuitUpdate(data);
            }
        } catch (err) {
            const errorMessage = `Circuit initialization failed: ${err.message}`;
            setError(errorMessage);
            console.error('❌ Error initializing circuit:', err);
            
            // Show user-friendly error message
            alert(`❌ ${errorMessage}\n\nPlease check:\n- Backend server is running\n- Try refreshing the page`);
        } finally {
            setIsLoading(false);
        }
    };

    const addGate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const gatePayload = {
                gate: selectedGate,
                target: targetQubit,
                control: availableGates.find(g => g.id === selectedGate)?.twoQubit ? controlQubit : null
            };
            
            console.log('🚪 Adding gate:', gatePayload);
            
            const response = await fetch('/api/add-gate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(gatePayload)
            });

            console.log('📡 Add gate response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Add gate error:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to add gate`);
            }

            const data = await response.json();
            console.log('✅ Add gate response data:', data);

            if (!data.success) {
                throw new Error(data.error || 'Gate addition failed');
            }

            setGates(data.gates || []);
            setBlochSpheres(data.bloch_spheres || []);
            setCircuitImage(data.circuit_image || '');
            
            console.log('🎉 Gate added successfully');
            console.log('📊 Updated gates:', data.gates?.length || 0);
            console.log('🎨 Circuit image updated:', data.circuit_image ? 'Yes' : 'No');
            
            if (onCircuitUpdate) {
                onCircuitUpdate(data);
            }
        } catch (err) {
            const errorMessage = `Failed to add ${selectedGate.toUpperCase()} gate: ${err.message}`;
            setError(errorMessage);
            console.error('❌ Gate operation failed:', {
                error: err,
                gate: selectedGate,
                target: targetQubit,
                control: availableGates.find(g => g.id === selectedGate)?.twoQubit ? controlQubit : null
            });
            
            // Show user-friendly error message
            alert(`❌ ${errorMessage}\n\nPlease check:\n- Circuit is initialized\n- Valid qubit indices\n- Backend connection`);
        } finally {
            setIsLoading(false);
        }
    };

    const runSimulation = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/run-simulation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    shots: 1024
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Simulation failed');
            }

            setResults({
                counts: data.counts,
                histogram: data.histogram_image
            });
        } catch (err) {
            setError(err.message);
            console.error('Simulation error', {
                error: err,
                request: { shots: 1024 }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setUploadedFile(file.name);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload-qasm', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Server processing failed');
            }

            // Update circuit with uploaded data
            setGates(data.gates || []);
            setBlochSpheres(data.bloch_spheres || []);
            setCircuitImage(data.circuit_image || '');
            setNumQubits(data.num_qubits || 2);

            console.log('QASM file uploaded successfully');
            
            if (onCircuitUpdate) {
                onCircuitUpdate(data);
            }
        } catch (error) {
            setError(`Upload failed: ${error.message}`);
            setUploadedFile(null);
        } finally {
            setIsLoading(false);
        }
    };

    const exportQASM = async () => {
        try {
            if (gates.length === 0) {
                alert('No gates to export. Please add some gates to the circuit first.');
                return;
            }

            const response = await fetch('/api/export-qasm', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to export QASM');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Export failed');
            }

            // Create and download the file
            const blob = new Blob([data.qasm_code], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quantum_circuit_${new Date().toISOString().slice(0, 10)}.qasm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log('QASM exported successfully');
        } catch (error) {
            setError(`Export failed: ${error.message}`);
            console.error('QASM export error:', error);
        }
    };

    const clearCircuit = async () => {
        try {
            const response = await fetch('/api/clear-circuit', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setGates([]);
                    setResults(null);
                    setBlochSpheres([]);
                    setCircuitImage('');
                    console.log('Circuit cleared successfully');
                    return;
                }
            }
        } catch (error) {
            console.warn('Backend clear failed, clearing frontend only:', error);
        }
        
        // Fallback: clear frontend state even if backend fails
        setGates([]);
        setResults(null);
        setBlochSpheres([]);
        setCircuitImage('');
    };

    return (
        <div className="circuit-builder advanced-features">
            <div className="features-header">
                <h2>🚀 Advanced Quantum Circuit Builder</h2>
                <p>Professional quantum circuit design with cutting-edge visualization and simulation capabilities</p>
            </div>

            <div className="features-navigation">
                <div className="feature-tabs">
                    {features.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveFeature(feature.id)}
                            className={`feature-tab ${activeFeature === feature.id ? 'active' : ''}`}
                            style={{ borderColor: activeFeature === feature.id ? feature.color : 'transparent' }}
                        >
                            <span className="feature-icon" style={{ color: feature.color }}>
                                {feature.icon}
                            </span>
                            <div className="feature-info">
                                <div className="feature-name">{feature.name}</div>
                                <div className="feature-description">{feature.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="error-banner" style={{ 
                    background: '#ffebee', 
                    color: '#c62828', 
                    padding: '1rem', 
                    borderRadius: '15px', 
                    marginBottom: '2rem', 
                    border: '2px solid #ef5350',
                    boxShadow: '0 4px 15px rgba(239, 83, 80, 0.2)'
                }}>
                    <strong>⚠️ Error:</strong> {error}
                </div>
            )}

            <div className="features-content">
                {activeFeature === 'standard' && (
                    <div className="feature-panel">
                        <div className="panel-header">
                            <h3>🔧 Standard Circuit Builder</h3>
                            <p>Classic quantum circuit building with modern interface</p>
                        </div>
                        
                        <div className="builder-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                            <div className="builder-controls">
                                {/* Circuit Setup */}
                                <div className="control-section circuit-setup">
                                    <h4>⚙️ Circuit Configuration</h4>
                                    <div className="config-grid">
                                        <div className="config-item">
                                            <label>Number of Qubits:</label>
                                            <input 
                                                type="number" 
                                                value={numQubits} 
                                                onChange={handleNumQubitsChange} 
                                                min="1" 
                                                max="10" 
                                                disabled={isLoading}
                                                className="qubit-input"
                                            />
                                        </div>
                                        <button 
                                            onClick={initializeCircuit} 
                                            disabled={isLoading}
                                            className="btn-primary"
                                        >
                                            {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                                        </button>
                                    </div>
                                </div>

                                {/* Gate Selection */}
                                <div className="control-section gate-selection">
                                    <h4>🎯 Quantum Gates</h4>
                                    <div className="gates-grid">
                                        {availableGates.map((gate) => (
                                            <button
                                                key={gate.id}
                                                className={`gate-button ${selectedGate === gate.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedGate(gate.id)}
                                                style={{ borderColor: selectedGate === gate.id ? gate.color : 'transparent' }}
                                                title={gate.description}
                                                disabled={isLoading}
                                            >
                                                <span className="gate-symbol">{gate.symbol}</span>
                                                <span className="gate-name">{gate.name}</span>
                                                {gate.twoQubit && <span className="gate-type">2-Qubit</span>}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="gate-info-panel">
                                        <strong>Selected:</strong> {availableGates.find(g => g.id === selectedGate)?.name}<br/>
                                        <span className="gate-description">{availableGates.find(g => g.id === selectedGate)?.description}</span>
                                    </div>
                                </div>

                                {/* Qubit Selection */}
                                <div className="control-section qubit-selection">
                                    <h4>🎛️ Target Configuration</h4>
                                    <div className="qubit-config">
                                        <div className="qubit-selector-group">
                                            <label>Target Qubit:</label>
                                            <select
                                                value={targetQubit}
                                                onChange={(e) => setTargetQubit(parseInt(e.target.value))}
                                                disabled={isLoading}
                                                className="qubit-selector"
                                            >
                                                {Array.from({ length: numQubits }, (_, i) => (
                                                    <option key={i} value={i}>Qubit {i}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {availableGates.find(g => g.id === selectedGate)?.twoQubit && (
                                            <div className="qubit-selector-group">
                                                <label>Control Qubit:</label>
                                                <select
                                                    value={controlQubit}
                                                    onChange={(e) => setControlQubit(parseInt(e.target.value))}
                                                    disabled={isLoading}
                                                    className="qubit-selector"
                                                >
                                                    {Array.from({ length: numQubits }, (_, i) => (
                                                        <option key={i} value={i} disabled={i === targetQubit}>
                                                            Qubit {i}{i === targetQubit ? " (target)" : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={addGate} 
                                            disabled={isLoading} 
                                            className="btn-add-gate"
                                        >
                                            {isLoading ? '⏳ Adding...' : '➕ Add Gate'}
                                        </button>
                                    </div>
                                </div>

                                {/* Circuit Operations */}
                                <div className="control-section circuit-operations">
                                    <h4>⚡ Operations</h4>
                                    <div className="operation-buttons">
                                        <button 
                                            onClick={runSimulation} 
                                            disabled={isLoading || gates.length === 0}
                                            className="btn-run"
                                        >
                                            {isLoading ? '⏳ Running...' : '▶️ Run Simulation'}
                                        </button>
                                        <button 
                                            onClick={clearCircuit} 
                                            disabled={isLoading || gates.length === 0}
                                            className="btn-clear"
                                        >
                                            🗑️ Clear Circuit
                                        </button>
                                        <button 
                                            onClick={exportQASM} 
                                            disabled={gates.length === 0}
                                            className="btn-export"
                                        >
                                            📥 Export QASM
                                        </button>
                                    </div>
                                </div>

                                {/* QASM Upload */}
                                <div className="control-section qasm-upload">
                                    <h4>📤 QASM Import</h4>
                                    <div className="upload-area">
                                        <input
                                            type="file"
                                            accept=".qasm,.txt"
                                            onChange={handleFileUpload}
                                            disabled={isLoading}
                                            id="qasm-file-input"
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="qasm-file-input" className="upload-label">
                                            <FaUpload />
                                            {uploadedFile || 'Choose QASM file'}
                                        </label>
                                        <p className="upload-hint">Supported: .qasm, .txt files</p>
                                    </div>
                                </div>

                                {/* Applied Gates */}
                                {gates.length > 0 && (
                                    <div className="control-section applied-gates">
                                        <h4>📋 Applied Gates ({gates.length})</h4>
                                        <div className="gates-list">
                                            {gates.map((gate, index) => (
                                                <div key={index} className="gate-item">
                                                    <span className="gate-info">
                                                        {index + 1}. {typeof gate === 'string' ? gate : gate.type ? gate.type.toUpperCase() : 'GATE'} 
                                                        {gate.control !== undefined ? ` (C${gate.control}→T${gate.target})` : gate.target !== undefined ? ` (Q${gate.target})` : ''}
                                                    </span>
                                                    <button 
                                                        onClick={() => { 
                                                            const newGates = gates.filter((_, i) => i !== index); 
                                                            setGates(newGates); 
                                                        }} 
                                                        className="remove-gate"
                                                        title="Remove gate"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="builder-visualization">
                                {/* Circuit Diagram */}
                                {circuitImage && (
                                    <div className="visualization-section">
                                        <h4>🔗 Circuit Diagram</h4>
                                        <div className="circuit-image-container">
                                            <img 
                                                src={`data:image/png;base64,${circuitImage}`} 
                                                alt="Quantum circuit" 
                                                className="circuit-image"
                                            />
                                            <div className="circuit-info">
                                                Circuit with {numQubits} qubit{numQubits !== 1 ? 's' : ''} and {gates.length} gate{gates.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Simulation Results */}
                                {results && (
                                    <div className="visualization-section">
                                        <h4>📊 Simulation Results</h4>
                                        <div className="results-container">
                                            {results.histogram && (
                                                <div className="histogram-container">
                                                    <img 
                                                        src={`data:image/png;base64,${results.histogram}`} 
                                                        alt="Measurement histogram" 
                                                        className="histogram-image"
                                                    />
                                                </div>
                                            )}
                                            {results.counts && (
                                                <div className="counts-container">
                                                    <h5>Measurement Counts:</h5>
                                                    <div className="counts-grid">
                                                        {Object.entries(results.counts).map(([state, count]) => (
                                                            <div key={state} className="count-item">
                                                                <div className="state-label">|{state}⟩</div>
                                                                <div className="count-value">{count}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Bloch Spheres */}
                                {blochSpheres.length > 0 && (
                                    <div className="visualization-section">
                                        <h4>🌐 Quantum States</h4>
                                        <BlochSpheres spheres={blochSpheres}/>
                                    </div>
                                )}

                                {!circuitImage && !blochSpheres.length && !results && (
                                    <div className="empty-state">
                                        <div className="empty-content">
                                            <h3>🚀 Ready to Build</h3>
                                            <p>Initialize a circuit and start adding gates to see the visualization</p>
                                            <div className="empty-steps">
                                                1. Set number of qubits<br/>
                                                2. Click "Initialize Circuit"<br/>
                                                3. Select gates and add them<br/>
                                                4. Run simulation to see results
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === '3d-visualization' && (
                    <div className="feature-panel">
                        <div className="panel-header">
                            <h3>🎯 3D Quantum Visualization</h3>
                            <p>Interactive 3D Bloch spheres with real-time state representation</p>
                        </div>
                        
                        <div className="builder-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                            <div className="builder-controls">
                                {/* Same controls as standard but with 3D options */}
                                <div className="control-section">
                                    <h4>⚙️ Circuit Configuration</h4>
                                    <div className="config-grid">
                                        <div className="config-item">
                                            <label>Number of Qubits:</label>
                                            <input 
                                                type="number" 
                                                value={numQubits} 
                                                onChange={handleNumQubitsChange} 
                                                min="1" 
                                                max="5" 
                                                disabled={isLoading}
                                                className="qubit-input"
                                            />
                                        </div>
                                        <button 
                                            onClick={initializeCircuit} 
                                            disabled={isLoading}
                                            className="btn-primary"
                                        >
                                            {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                                        </button>
                                    </div>
                                    <div className="feature-option">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={use3DVisualization} 
                                                onChange={(e) => setUse3DVisualization(e.target.checked)}
                                            />
                                            Enable Interactive 3D
                                        </label>
                                    </div>
                                </div>

                                {/* Standard gate controls */}
                                <div className="control-section gate-selection">
                                    <h4>🎯 Quantum Gates</h4>
                                    <div className="gates-grid">
                                        {availableGates.map((gate) => (
                                            <button
                                                key={gate.id}
                                                className={`gate-button ${selectedGate === gate.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedGate(gate.id)}
                                                style={{ borderColor: selectedGate === gate.id ? gate.color : 'transparent' }}
                                                disabled={isLoading}
                                            >
                                                <span className="gate-symbol">{gate.symbol}</span>
                                                <span className="gate-name">{gate.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Qubit selection and operations */}
                                <div className="control-section qubit-selection">
                                    <h4>🎛️ Target Configuration</h4>
                                    <div className="qubit-config">
                                        <div className="qubit-selector-group">
                                            <label>Target Qubit:</label>
                                            <select value={targetQubit} onChange={(e) => setTargetQubit(parseInt(e.target.value))} disabled={isLoading}>
                                                {Array.from({ length: numQubits }, (_, i) => (
                                                    <option key={i} value={i}>Qubit {i}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {availableGates.find(g => g.id === selectedGate)?.twoQubit && (
                                            <div className="qubit-selector-group">
                                                <label>Control Qubit:</label>
                                                <select value={controlQubit} onChange={(e) => setControlQubit(parseInt(e.target.value))} disabled={isLoading}>
                                                    {Array.from({ length: numQubits }, (_, i) => (
                                                        <option key={i} value={i} disabled={i === targetQubit}>
                                                            Qubit {i}{i === targetQubit ? " (target)" : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        
                                        <button onClick={addGate} disabled={isLoading} className="btn-add-gate">
                                            {isLoading ? '⏳ Adding...' : '➕ Add Gate'}
                                        </button>
                                    </div>
                                </div>

                                <div className="control-section circuit-operations">
                                    <h4>⚡ Operations</h4>
                                    <div className="operation-buttons">
                                        <button onClick={runSimulation} disabled={isLoading || gates.length === 0} className="btn-run">
                                            {isLoading ? '⏳ Running...' : '▶️ Run Simulation'}
                                        </button>
                                        <button onClick={clearCircuit} disabled={isLoading || gates.length === 0} className="btn-clear">
                                            🗑️ Clear Circuit
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="builder-visualization">
                                {/* 3D Bloch Spheres */}
                                {use3DVisualization && blochSpheres.length > 0 && (
                                    <div className="visualization-section">
                                        <h4>🌐 3D Quantum States</h4>
                                        <div className="bloch-spheres-grid">
                                            {blochSpheres.map((sphere, index) => (
                                                <BlochSphere3D
                                                    key={index}
                                                    qubitState={sphere}
                                                    qubitIndex={index}
                                                    isInteractive={true}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Standard visualizations */}
                                {circuitImage && (
                                    <div className="visualization-section">
                                        <h4>🔗 Circuit Diagram</h4>
                                        <div className="circuit-image-container">
                                            <img src={`data:image/png;base64,${circuitImage}`} alt="Quantum circuit" className="circuit-image" />
                                        </div>
                                    </div>
                                )}

                                {!use3DVisualization && blochSpheres.length > 0 && (
                                    <div className="visualization-section">
                                        <h4>🌐 Quantum States (2D)</h4>
                                        <BlochSpheres spheres={blochSpheres}/>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === 'hardware-integration' && (
                    <div className="feature-panel">
                        <div className="panel-header">
                            <h3>🚀 IBM Quantum Hardware Integration</h3>
                            <p>Connect to real quantum computers for authentic quantum computing experience</p>
                        </div>
                        
                        <div className="builder-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                            <div className="builder-controls">
                                <div className="control-section">
                                    <h4>🔌 Hardware Connection</h4>
                                    <IBMQuantumIntegration
                                        onDeviceSelect={(device) => setSelectedDevice(device)}
                                        selectedDevice={selectedDevice}
                                    />
                                </div>

                                {selectedDevice && (
                                    <div className="control-section">
                                        <h4>📊 Device Information</h4>
                                        <div className="device-info">
                                            <div className="device-metric">
                                                <span>Device:</span>
                                                <span>{selectedDevice.name}</span>
                                            </div>
                                            <div className="device-metric">
                                                <span>Qubits:</span>
                                                <span>{selectedDevice.qubits}</span>
                                            </div>
                                            <div className="device-metric">
                                                <span>Status:</span>
                                                <span className={`status ${selectedDevice.status}`}>{selectedDevice.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Standard circuit controls */}
                                <div className="control-section">
                                    <h4>⚙️ Circuit Configuration</h4>
                                    <div className="config-grid">
                                        <div className="config-item">
                                            <label>Number of Qubits:</label>
                                            <input 
                                                type="number" 
                                                value={numQubits} 
                                                onChange={handleNumQubitsChange} 
                                                min="1" 
                                                max={selectedDevice ? selectedDevice.qubits : 10}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <button onClick={initializeCircuit} disabled={isLoading} className="btn-primary">
                                            {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="builder-visualization">
                                {selectedDevice && (
                                    <div className="visualization-section">
                                        <h4>🔧 Hardware Capabilities</h4>
                                        <div className="hardware-features">
                                            <div className="capability-item">
                                                <span className="capability-icon">⚛️</span>
                                                <div>
                                                    <strong>Quantum Volume:</strong> Real quantum hardware performance metrics
                                                </div>
                                            </div>
                                            <div className="capability-item">
                                                <span className="capability-icon">🔗</span>
                                                <div>
                                                    <strong>Connectivity:</strong> Device-specific qubit coupling topology
                                                </div>
                                            </div>
                                            <div className="capability-item">
                                                <span className="capability-icon">📈</span>
                                                <div>
                                                    <strong>Live Status:</strong> Real-time queue and calibration data
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {circuitImage && (
                                    <div className="visualization-section">
                                        <h4>🔗 Circuit Diagram</h4>
                                        <div className="circuit-image-container">
                                            <img src={`data:image/png;base64,${circuitImage}`} alt="Quantum circuit" className="circuit-image" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === 'circuit-animation' && (
                    <div className="feature-panel">
                        <div className="panel-header">
                            <h3>🎬 Circuit Animation & State Evolution</h3>
                            <p>Watch quantum circuits execute step-by-step with live state visualization</p>
                        </div>
                        
                        <div className="builder-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                            <div className="builder-controls">
                                <div className="control-section">
                                    <h4>🎮 Animation Controls</h4>
                                    <div className="animation-options">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={enableAnimation} 
                                                onChange={(e) => setEnableAnimation(e.target.checked)}
                                            />
                                            Enable Step-by-Step Animation
                                        </label>
                                        
                                        <button
                                            onClick={() => setIsAnimationPlaying(!isAnimationPlaying)}
                                            disabled={!enableAnimation || gates.length === 0}
                                            className="animation-toggle"
                                        >
                                            {isAnimationPlaying ? '⏸️ Pause Animation' : '▶️ Start Animation'}
                                        </button>
                                    </div>
                                </div>

                                {/* Standard circuit controls */}
                                <div className="control-section">
                                    <h4>⚙️ Circuit Configuration</h4>
                                    <div className="config-grid">
                                        <div className="config-item">
                                            <label>Number of Qubits:</label>
                                            <input 
                                                type="number" 
                                                value={numQubits} 
                                                onChange={handleNumQubitsChange} 
                                                min="1" 
                                                max="5"
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <button onClick={initializeCircuit} disabled={isLoading} className="btn-primary">
                                            {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="builder-visualization">
                                {enableAnimation && (
                                    <div className="visualization-section">
                                        <h4>🎬 Circuit Animation</h4>
                                        <CircuitAnimator
                                            circuit={gates}
                                            isPlaying={isAnimationPlaying}
                                            onAnimationComplete={() => setIsAnimationPlaying(false)}
                                        />
                                    </div>
                                )}

                                {circuitImage && (
                                    <div className="visualization-section">
                                        <h4>🔗 Circuit Diagram</h4>
                                        <div className="circuit-image-container">
                                            <img src={`data:image/png;base64,${circuitImage}`} alt="Quantum circuit" className="circuit-image" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === 'noise-modeling' && (
                    <div className="feature-panel">
                        <div className="panel-header">
                            <h3>🔬 Advanced Noise Modeling</h3>
                            <p>Realistic quantum device simulation with comprehensive error modeling</p>
                        </div>
                        
                        <div className="builder-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                            <div className="builder-controls">
                                <div className="control-section">
                                    <h4>🧪 Noise Configuration</h4>
                                    <AdvancedNoiseModeling
                                        onNoiseChange={(noise) => setNoiseModel(noise)}
                                        circuit={gates}
                                    />
                                </div>

                                <div className="control-section">
                                    <h4>⚙️ Circuit Configuration</h4>
                                    <div className="config-grid">
                                        <div className="config-item">
                                            <label>Number of Qubits:</label>
                                            <input 
                                                type="number" 
                                                value={numQubits} 
                                                onChange={handleNumQubitsChange} 
                                                min="1" 
                                                max="10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <button onClick={initializeCircuit} disabled={isLoading} className="btn-primary">
                                            {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="builder-visualization">
                                {noiseModel && (
                                    <div className="visualization-section">
                                        <h4>📊 Noise Model Analysis</h4>
                                        <div className="noise-analysis">
                                            <div className="noise-summary">
                                                <h5>🕐 Coherence Times</h5>
                                                <p>T₁: {noiseModel.t1_times?.join(', ')} μs</p>
                                                <p>T₂: {noiseModel.t2_times?.join(', ')} μs</p>
                                            </div>
                                            <div className="noise-summary">
                                                <h5>🎯 Gate Errors</h5>
                                                <p>Single-qubit: ~{Object.values(noiseModel.single_gate_errors || {}).reduce((a,b) => a+b, 0) / Object.keys(noiseModel.single_gate_errors || {}).length * 100}%</p>
                                                <p>Two-qubit: ~{Object.values(noiseModel.two_gate_errors || {}).reduce((a,b) => a+b, 0) / Object.keys(noiseModel.two_gate_errors || {}).length * 100}%</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {circuitImage && (
                                    <div className="visualization-section">
                                        <h4>🔗 Circuit Diagram</h4>
                                        <div className="circuit-image-container">
                                            <img src={`data:image/png;base64,${circuitImage}`} alt="Quantum circuit" className="circuit-image" />
                                        </div>
                                    </div>
                                )}

                                {results && (
                                    <div className="visualization-section">
                                        <h4>📊 Noisy Simulation Results</h4>
                                        <div className="results-container">
                                            {results.histogram && (
                                                <img src={`data:image/png;base64,${results.histogram}`} alt="Noisy measurement histogram" className="histogram-image" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="features-summary">
                <div className="summary-card">
                    <h4>🚀 Advanced Circuit Builder Features</h4>
                    <p>
                        Experience professional quantum circuit design with industry-leading features:
                    </p>
                    <ul>
                        <li>✅ Multiple visualization modes (2D, 3D, Animation)</li>
                        <li>✅ Hardware integration capabilities</li>
                        <li>✅ Advanced noise modeling</li>
                        <li>✅ Step-by-step execution animation</li>
                        <li>✅ QASM import/export functionality</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
