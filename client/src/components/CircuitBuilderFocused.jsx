import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';
import BlochSphere3D from './BlochSphere3D';
import CircuitAnimator from './CircuitAnimator';
import AdvancedNoiseModeling from './AdvancedNoiseModeling';
import IBMQuantumIntegration from './IBMQuantumIntegration';
import ResultsViewer from './ResultsViewer';
import QASMUploader from './QASMUploader';
import { FaPlay, FaRedo, FaDownload, FaUpload, FaClearAll, FaPlus, FaMinus, FaCog, FaCube, FaRocket, FaFilm, FaAtom, FaLayerGroup } from 'react-icons/fa';

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
    
    const [circuitStats, setCircuitStats] = useState({
        totalGates: 0,
        depth: 0,
        singleQubitGates: 0,
        twoQubitGates: 0
    });

    const features = [
        {
            id: 'standard',
            name: 'Standard Mode',
            icon: <FaLayerGroup />,
            description: 'Classic circuit building with modern visualization',
            gradient: 'from-blue-500 to-indigo-600',
            bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50'
        },
        {
            id: '3d-visualization',
            name: '3D Visualization',
            icon: <FaCube />,
            description: 'Interactive 3D Bloch spheres with real-time updates',
            gradient: 'from-green-500 to-teal-600',
            bgColor: 'bg-gradient-to-br from-green-50 to-teal-50'
        },
        {
            id: 'hardware-integration',
            name: 'Quantum Hardware',
            icon: <FaRocket />,
            description: 'Connect to real quantum computers and simulators',
            gradient: 'from-purple-500 to-pink-600',
            bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50'
        },
        {
            id: 'circuit-animation',
            name: 'Circuit Animation',
            icon: <FaFilm />,
            description: 'Watch circuits execute step-by-step with state evolution',
            gradient: 'from-orange-500 to-red-600',
            bgColor: 'bg-gradient-to-br from-orange-50 to-red-50'
        },
        {
            id: 'noise-modeling',
            name: 'Noise Modeling',
            icon: <FaAtom />,
            description: 'Realistic quantum device noise and error simulation',
            gradient: 'from-cyan-500 to-blue-600',
            bgColor: 'bg-gradient-to-br from-cyan-50 to-blue-50'
        }
    ];

    const gateCategories = {
        'Single Qubit': [
            { id: 'h', name: 'Hadamard', symbol: 'H', description: 'Creates superposition', color: '#3b82f6' },
            { id: 'x', name: 'Pauli-X', symbol: 'X', description: 'Bit flip gate', color: '#10b981' },
            { id: 'y', name: 'Pauli-Y', symbol: 'Y', description: 'Y rotation', color: '#f59e0b' },
            { id: 'z', name: 'Pauli-Z', symbol: 'Z', description: 'Phase flip gate', color: '#8b5cf6' },
            { id: 's', name: 'S Gate', symbol: 'S', description: 'Phase gate', color: '#06b6d4' },
            { id: 't', name: 'T Gate', symbol: 'T', description: 'π/8 phase gate', color: '#84cc16' }
        ],
        'Two Qubit': [
            { id: 'cx', name: 'CNOT', symbol: '⊕', description: 'Controlled NOT', color: '#ef4444', twoQubit: true },
            { id: 'cz', name: 'Controlled-Z', symbol: 'CZ', description: 'Controlled Z', color: '#f97316', twoQubit: true },
            { id: 'swap', name: 'SWAP', symbol: '×', description: 'Swap qubits', color: '#ec4899', twoQubit: true }
        ]
    };

    const allGates = [...gateCategories['Single Qubit'], ...gateCategories['Two Qubit']];

    const handleNumQubitsChange = (e) => {
        const value = parseInt(e.target.value) || 2;
        setNumQubits(Math.max(1, Math.min(10, value)));
    };

    const handleDeviceSelect = (device) => {
        setSelectedDevice(device);
        console.log('Selected device:', device);
    };

    const handleNoiseChange = (noise) => {
        setNoiseModel(noise);
        console.log('Noise model updated:', noise);
    };

    const handleAnimationComplete = () => {
        setIsAnimationPlaying(false);
        console.log('Animation completed');
    };

    const calculateCircuitStats = (gateList) => {
        const stats = {
            totalGates: gateList.length,
            depth: 0,
            singleQubitGates: 0,
            twoQubitGates: 0
        };

        gateList.forEach(gate => {
            const gateInfo = allGates.find(g => g.id === gate.gate);
            if (gateInfo?.twoQubit) {
                stats.twoQubitGates++;
            } else {
                stats.singleQubitGates++;
            }
        });

        // Simple depth calculation (could be more sophisticated)
        stats.depth = Math.max(1, Math.ceil(stats.totalGates / numQubits));
        
        return stats;
    };

    const initializeCircuit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('🔄 Initializing circuit with', numQubits, 'qubits');
            
            const response = await fetch('/api/init-circuit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ num_qubits: numQubits })
            });

            console.log('📡 Init circuit response status:', response.status);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('✅ Init circuit response data:', data);
            
            setGates([]);
            setBlochSpheres(data.bloch_images || []);
            setCircuitImage(data.circuit_image || '');
            setCircuitStats(calculateCircuitStats([]));
            setResults(null);
            
            if (onCircuitUpdate) onCircuitUpdate(data);
        } catch (error) {
            console.error('❌ Initialize circuit error:', error);
            setError(`Failed to initialize circuit: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const addGate = async () => {
        if (isLoading) return;
        
        const gate = allGates.find(g => g.id === selectedGate);
        if (!gate) return;

        const newGate = {
            gate: selectedGate,
            target: targetQubit,
            control: gate.twoQubit ? controlQubit : undefined
        };

        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/add-gate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newGate)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const updatedGates = [...gates, newGate];
            setGates(updatedGates);
            setBlochSpheres(data.bloch_images || []);
            setCircuitImage(data.circuit_image || '');
            setCircuitStats(calculateCircuitStats(updatedGates));
            
            if (onCircuitUpdate) onCircuitUpdate(data);
        } catch (error) {
            setError(`Failed to add gate: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const runCircuit = async () => {
        if (isLoading || gates.length === 0) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/run-simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            setResults(data);
        } catch (error) {
            setError(`Failed to run circuit: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const clearCircuit = () => {
        setGates([]);
        setResults(null);
        setCircuitImage('');
        setBlochSpheres([]);
        setCircuitStats({ totalGates: 0, depth: 0, singleQubitGates: 0, twoQubitGates: 0 });
        setError(null);
    };

    const handleFileUpload = (file, content) => {
        setUploadedFile(file);
        console.log('File uploaded:', file.name, content);
        // Process QASM content here
    };

    const exportQASM = async () => {
        try {
            const response = await fetch('/api/export-qasm', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const qasmData = await response.text();
            const blob = new Blob([qasmData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'quantum_circuit.qasm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            setError(`Failed to export QASM: ${error.message}`);
        }
    };

    const handleQASMUpload = async (qasmContent) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/upload-qasm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ qasm_content: qasmContent })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            setGates(data.gates || []);
            setBlochSpheres(data.bloch_images || []);
            setCircuitImage(data.circuit_image || '');
            setCircuitStats(calculateCircuitStats(data.gates || []));
            setResults(null);
            
            if (onCircuitUpdate) onCircuitUpdate(data);
        } catch (error) {
            setError(`Failed to upload QASM: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Only initialize if we're in standard mode to avoid API calls when not needed
        if (activeFeature === 'standard') {
            console.log('🚀 Component mounted, initializing circuit...');
            initializeCircuit();
        }
    }, [numQubits, activeFeature]);

    return (
        <div className="circuit-builder-modern">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="gradient-text">Quantum Circuit Builder</span>
                    </h1>
                    <p className="hero-subtitle">
                        Design, simulate, and visualize quantum circuits with advanced features
                    </p>
                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-number">{circuitStats.totalGates}</span>
                            <span className="stat-label">Gates Added</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{circuitStats.depth}</span>
                            <span className="stat-label">Circuit Depth</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{numQubits}</span>
                            <span className="stat-label">Qubits</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Debug Info */}
            {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '1rem', margin: '1rem', borderRadius: '0.5rem' }}>
                    <h3 style={{ color: '#dc2626', margin: '0 0 0.5rem 0' }}>⚠️ Error</h3>
                    <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
                </div>
            )}

            {isLoading && (
                <div style={{ background: '#dbeafe', border: '1px solid #bfdbfe', padding: '1rem', margin: '1rem', borderRadius: '0.5rem' }}>
                    <p style={{ color: '#1e40af', margin: 0 }}>⏳ Loading...</p>
                </div>
            )}

            {/* Feature Navigation */}
            <div className="feature-nav">
                <div className="nav-container">
                    {features.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveFeature(feature.id)}
                            className={`feature-nav-card ${activeFeature === feature.id ? 'active' : ''}`}
                        >
                            <div className="nav-card-content">
                                <div className="nav-icon">{feature.icon}</div>
                                <div className="nav-text">
                                    <h3 className="nav-title">{feature.name}</h3>
                                    <p className="nav-description">{feature.description}</p>
                                </div>
                            </div>
                            <div className={`nav-indicator bg-gradient-to-r ${feature.gradient}`}></div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Feature Content */}
            <div className="feature-content">
                {activeFeature === 'standard' && (
                    <div className="feature-panel standard-panel">
                        <div className="panel-header">
                            <h2>🔧 Standard Circuit Builder</h2>
                            <p>Classic quantum circuit design with modern interface</p>
                        </div>

                        <div className="builder-layout">
                            <div className="builder-controls">
                                {/* Circuit Configuration */}
                                <div className="control-section">
                                    <h4>⚙️ Circuit Configuration</h4>
                                    <div className="config-grid">
                                        <div className="config-item">
                                            <label>Number of Qubits:</label>
                                            <div className="qubit-controls">
                                                <button 
                                                    onClick={() => setNumQubits(Math.max(1, numQubits - 1))}
                                                    className="qubit-btn"
                                                    disabled={numQubits <= 1 || isLoading}
                                                >
                                                    <FaMinus />
                                                </button>
                                                <span className="qubit-count">{numQubits}</span>
                                                <button 
                                                    onClick={() => setNumQubits(Math.min(10, numQubits + 1))}
                                                    className="qubit-btn"
                                                    disabled={numQubits >= 10 || isLoading}
                                                >
                                                    <FaPlus />
                                                </button>
                                            </div>
                                        </div>
                                        <button onClick={initializeCircuit} disabled={isLoading} className="btn-primary">
                                            {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                                        </button>
                                    </div>
                                </div>

                                {/* Gate Selection */}
                                <div className="control-section gate-selection">
                                    <h4>🎯 Quantum Gates</h4>
                                    {Object.entries(gateCategories).map(([category, gates]) => (
                                        <div key={category} className="gate-category">
                                            <h5>{category}</h5>
                                            <div className="gates-grid">
                                                {gates.map(gate => (
                                                    <button
                                                        key={gate.id}
                                                        onClick={() => setSelectedGate(gate.id)}
                                                        className={`gate-button ${selectedGate === gate.id ? 'selected' : ''}`}
                                                        style={{ borderColor: selectedGate === gate.id ? gate.color : 'transparent' }}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="gate-symbol">{gate.symbol}</span>
                                                        <span className="gate-name">{gate.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Qubit Controls */}
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
                                        
                                        {allGates.find(g => g.id === selectedGate)?.twoQubit && (
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

                                {/* Circuit Operations */}
                                <div className="control-section circuit-operations">
                                    <h4>⚡ Operations</h4>
                                    <div className="operation-buttons">
                                        <button onClick={runCircuit} disabled={isLoading || gates.length === 0} className="btn-run">
                                            {isLoading ? '⏳ Running...' : '▶️ Run Simulation'}
                                        </button>
                                        <button onClick={clearCircuit} disabled={isLoading || gates.length === 0} className="btn-clear">
                                            🗑️ Clear Circuit
                                        </button>
                                    </div>
                                </div>

                                {/* Circuit Statistics */}
                                <div className="control-section stats-section">
                                    <h4>📊 Circuit Statistics</h4>
                                    <div className="stats-display">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Gates:</span>
                                            <span className="stat-value">{circuitStats.totalGates}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Single Qubit:</span>
                                            <span className="stat-value">{circuitStats.singleQubitGates}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Two Qubit:</span>
                                            <span className="stat-value">{circuitStats.twoQubitGates}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Depth:</span>
                                            <span className="stat-value">{circuitStats.depth}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="builder-visualization">
                                {/* Circuit Image */}
                                {circuitImage && (
                                    <div className="visualization-section">
                                        <h4>🔗 Circuit Diagram</h4>
                                        <div className="circuit-image-container">
                                            <img src={`data:image/png;base64,${circuitImage}`} alt="Quantum circuit" className="circuit-image" />
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

                                {/* File Operations */}
                                <div className="visualization-section">
                                    <h4>📁 File Operations</h4>
                                    <div className="file-operations">
                                        <QASMUploader onUpload={handleQASMUpload} />
                                        <button onClick={exportQASM} disabled={gates.length === 0} className="btn-export">
                                            <FaDownload /> Export QASM
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === '3d-visualization' && (
                    <div className="feature-panel visualization-panel">
                        <div className="panel-header">
                            <h2>🎯 3D Quantum State Visualization</h2>
                            <p>Interactive 3D Bloch spheres with real-time state representation</p>
                        </div>
                        
                        <div className="builder-layout">
                            <div className="builder-controls">
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
                            </div>

                            <div className="builder-visualization">
                                {/* 3D Bloch Spheres */}
                                {use3DVisualization && blochSpheres.length > 0 && (
                                    <div className="bloch-grid">
                                        {blochSpheres.map((sphere, index) => (
                                            <div key={index} className="bloch-card">
                                                <div className="bloch-header">
                                                    <h4>Qubit {index}</h4>
                                                    <div className="state-badge">|ψ⟩</div>
                                                </div>
                                                <BlochSphere3D
                                                    qubitState={sphere}
                                                    qubitIndex={index}
                                                    isInteractive={true}
                                                />
                                                <div className="state-info">
                                                    <div className="coefficient">Interactive 3D View</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="features-showcase">
                                    <h3>✨ Interactive Features</h3>
                                    <div className="features-grid">
                                        <div className="feature-item">
                                            <div className="feature-icon">🖱️</div>
                                            <h4>Drag & Rotate</h4>
                                            <p>Intuitive mouse controls for 3D navigation</p>
                                        </div>
                                        <div className="feature-item">
                                            <div className="feature-icon">⚡</div>
                                            <h4>Real-time Updates</h4>
                                            <p>Watch states evolve as gates are applied</p>
                                        </div>
                                        <div className="feature-item">
                                            <div className="feature-icon">📐</div>
                                            <h4>Accurate Physics</h4>
                                            <p>Proper Bloch sphere geometry and mathematics</p>
                                        </div>
                                        <div className="feature-item">
                                            <div className="feature-icon">🎨</div>
                                            <h4>Beautiful Rendering</h4>
                                            <p>Smooth animations and realistic lighting</p>
                                        </div>
                                    </div>
                                </div>
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
                        
                        <div className="builder-layout">
                            <div className="builder-controls">
                                <div className="control-section">
                                    <h4>🔌 Hardware Connection</h4>
                                    <IBMQuantumIntegration
                                        onDeviceSelect={handleDeviceSelect}
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
                        
                        <div className="builder-layout">
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
                                            onAnimationComplete={handleAnimationComplete}
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
                        
                        <div className="builder-layout">
                            <div className="builder-controls">
                                <div className="control-section">
                                    <h4>🔧 Noise Configuration</h4>
                                    <AdvancedNoiseModeling
                                        onNoiseChange={handleNoiseChange}
                                        currentNoise={noiseModel}
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
                                        <h4>📊 Noise Model Information</h4>
                                        <div className="noise-info">
                                            <div className="noise-metric">
                                                <span>Model Type:</span>
                                                <span>{noiseModel.type}</span>
                                            </div>
                                            <div className="noise-metric">
                                                <span>Error Rate:</span>
                                                <span>{noiseModel.errorRate}%</span>
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

                {/* Results Display */}
                {results && (
                    <div className="results-section">
                        <div className="results-header">
                            <h2>📈 Circuit Results</h2>
                            <p>Quantum circuit execution results and measurements</p>
                        </div>
                        <ResultsViewer results={results} />
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="error-section">
                        <div className="error-card">
                            <h3>⚠️ Error</h3>
                            <p>{error}</p>
                            <button onClick={() => setError(null)} className="dismiss-btn">
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
