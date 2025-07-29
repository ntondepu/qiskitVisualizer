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
            
            if (onCircuitUpdate) {
                onCircuitUpdate(data);
            }
        } catch (err) {
            const errorMessage = `Circuit initialization failed: ${err.message}`;
            setError(errorMessage);
            console.error('❌ Error initializing circuit:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const addGate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const gatePayload = {
                gate_type: selectedGate,
                target_qubit: targetQubit,
                ...(availableGates.find(g => g.id === selectedGate)?.twoQubit && { control_qubit: controlQubit })
            };

            console.log('Adding gate:', gatePayload);

            const response = await fetch('/api/add-gate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(gatePayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to add gate`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gate addition failed');
            }

            // Update circuit state
            setGates(prev => [...prev, gatePayload]);
            setBlochSpheres(data.bloch_spheres || []);
            setCircuitImage(data.circuit_image || '');
            
            console.log('Gate added successfully');
        } catch (err) {
            const errorMessage = `Failed to add gate: ${err.message}`;
            setError(errorMessage);
            console.error('❌ Error adding gate:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const runSimulation = async () => {
        if (gates.length === 0) {
            setError('No gates in circuit to simulate');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/run-circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Simulation failed`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Simulation failed');
            }

            setResults(data);
            console.log('Simulation completed successfully');
        } catch (err) {
            const errorMessage = `Simulation failed: ${err.message}`;
            setError(errorMessage);
            console.error('❌ Error running simulation:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const clearCircuit = () => {
        setGates([]);
        setResults(null);
        setBlochSpheres([]);
        setCircuitImage('');
        setError(null);
        console.log('Circuit cleared');
    };

    const exportQASM = async () => {
        if (gates.length === 0) {
            setError('No gates in circuit to export');
            return;
        }

        try {
            const response = await fetch('/api/export-qasm', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to export QASM');
            }

            const data = await response.json();
            
            if (data.qasm) {
                // Create downloadable file
                const blob = new Blob([data.qasm], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quantum_circuit_${Date.now()}.qasm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('QASM exported successfully');
            }
        } catch (err) {
            setError(`Export failed: ${err.message}`);
            console.error('❌ Error exporting QASM:', err);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadedFile(file.name);
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload-qasm', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'QASM processing failed');
            }

            // Update circuit with uploaded data
            setGates(data.gates || []);
            setBlochSpheres(data.bloch_spheres || []);
            setCircuitImage(data.circuit_image || '');
            setNumQubits(data.num_qubits || numQubits);
            
            console.log('QASM uploaded successfully');
        } catch (err) {
            setError(`Upload failed: ${err.message}`);
            console.error('❌ Error uploading QASM:', err);
            setUploadedFile(null);
        } finally {
            setIsLoading(false);
        }
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
                                                style={{ 
                                                    borderColor: selectedGate === gate.id ? gate.color : 'transparent',
                                                    '--gate-color': gate.color
                                                }}
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
                                                        {index + 1}. {typeof gate === 'string' ? gate : gate.gate_type ? gate.gate_type.toUpperCase() : 'GATE'} 
                                                        {gate.control_qubit !== undefined ? ` (C${gate.control_qubit}→T${gate.target_qubit})` : gate.target_qubit !== undefined ? ` (Q${gate.target_qubit})` : ''}
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

                {/* Other feature modes would go here... */}
                {activeFeature !== 'standard' && (
                    <div className="feature-panel">
                        <div className="panel-header">
                            <h3>🚧 Coming Soon</h3>
                            <p>This advanced feature is currently under development</p>
                        </div>
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '15px' }}>
                            <h4>Advanced Feature: {features.find(f => f.id === activeFeature)?.name}</h4>
                            <p>{features.find(f => f.id === activeFeature)?.description}</p>
                            <p style={{ color: '#666', marginTop: '2rem' }}>
                                This feature will include enhanced visualization and simulation capabilities.
                                For now, please use the Standard Mode.
                            </p>
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
                        <li>✅ Standard circuit building with modern UI</li>
                        <li>🚧 3D visualization (coming soon)</li>
                        <li>🚧 Hardware integration (coming soon)</li>
                        <li>🚧 Circuit animation (coming soon)</li>
                        <li>🚧 Advanced noise modeling (coming soon)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
