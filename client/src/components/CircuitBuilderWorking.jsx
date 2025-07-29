import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';
import { FaPlay, FaRedo, FaDownload, FaUpload, FaClearAll, FaPlus, FaMinus } from 'react-icons/fa';

export default function CircuitBuilderSimple({ onCircuitUpdate }) {
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

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('✅ Init circuit response data:', data);
            
            setGates([]);
            setBlochSpheres(data.bloch_images || []);
            setCircuitImage(data.circuit_image || '');
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
        setError(null);
    };

    useEffect(() => {
        console.log('🚀 Circuit Builder mounted, initializing...');
        initializeCircuit();
    }, [numQubits]);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', color: '#2563eb', marginBottom: '2rem' }}>
                🔧 Quantum Circuit Builder
            </h1>
            
            {/* Error Display */}
            {error && (
                <div style={{ 
                    background: '#fee2e2', 
                    border: '1px solid #fecaca', 
                    padding: '1rem', 
                    marginBottom: '1rem', 
                    borderRadius: '0.5rem' 
                }}>
                    <h3 style={{ color: '#dc2626', margin: '0 0 0.5rem 0' }}>⚠️ Error</h3>
                    <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Loading Display */}
            {isLoading && (
                <div style={{ 
                    background: '#dbeafe', 
                    border: '1px solid #bfdbfe', 
                    padding: '1rem', 
                    marginBottom: '1rem', 
                    borderRadius: '0.5rem' 
                }}>
                    <p style={{ color: '#1e40af', margin: 0 }}>⏳ Loading...</p>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* Circuit Configuration */}
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>⚙️ Circuit Configuration</h3>
                    
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Number of Qubits: {numQubits}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button 
                                onClick={() => setNumQubits(Math.max(1, numQubits - 1))}
                                disabled={numQubits <= 1 || isLoading}
                                style={{ 
                                    background: '#3b82f6', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '0.5rem', 
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <FaMinus />
                            </button>
                            <span style={{ minWidth: '3rem', textAlign: 'center', fontWeight: 'bold' }}>
                                {numQubits}
                            </span>
                            <button 
                                onClick={() => setNumQubits(Math.min(10, numQubits + 1))}
                                disabled={numQubits >= 10 || isLoading}
                                style={{ 
                                    background: '#3b82f6', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '0.5rem', 
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <FaPlus />
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={initializeCircuit} 
                        disabled={isLoading}
                        style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        {isLoading ? '⏳ Initializing...' : '🚀 Initialize Circuit'}
                    </button>
                </div>

                {/* Gate Selection */}
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>🎯 Quantum Gates</h3>
                    
                    {Object.entries(gateCategories).map(([category, gates]) => (
                        <div key={category} style={{ marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                                {category}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                {gates.map(gate => (
                                    <button
                                        key={gate.id}
                                        onClick={() => setSelectedGate(gate.id)}
                                        disabled={isLoading}
                                        style={{
                                            background: selectedGate === gate.id ? gate.color : '#e2e8f0',
                                            color: selectedGate === gate.id ? 'white' : '#475569',
                                            border: 'none',
                                            padding: '0.5rem',
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        {gate.symbol}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Target/Control Selection */}
                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Target Qubit:</label>
                        <select 
                            value={targetQubit} 
                            onChange={(e) => setTargetQubit(parseInt(e.target.value))}
                            disabled={isLoading}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                        >
                            {Array.from({ length: numQubits }, (_, i) => (
                                <option key={i} value={i}>Qubit {i}</option>
                            ))}
                        </select>
                    </div>

                    {allGates.find(g => g.id === selectedGate)?.twoQubit && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Control Qubit:</label>
                            <select 
                                value={controlQubit} 
                                onChange={(e) => setControlQubit(parseInt(e.target.value))}
                                disabled={isLoading}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
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
                        style={{
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            width: '100%',
                            marginTop: '1rem'
                        }}
                    >
                        {isLoading ? '⏳ Adding...' : '➕ Add Gate'}
                    </button>
                </div>
            </div>

            {/* Operations */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button 
                    onClick={runCircuit} 
                    disabled={isLoading || gates.length === 0}
                    style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    <FaPlay /> {isLoading ? 'Running...' : 'Run Simulation'}
                </button>
                <button 
                    onClick={clearCircuit} 
                    disabled={isLoading || gates.length === 0}
                    style={{
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    <FaClearAll /> Clear Circuit
                </button>
            </div>

            {/* Visualizations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Circuit Image */}
                {circuitImage && (
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>🔗 Circuit Diagram</h3>
                        <img 
                            src={`data:image/png;base64,${circuitImage}`} 
                            alt="Quantum circuit" 
                            style={{ width: '100%', height: 'auto', borderRadius: '0.5rem' }}
                        />
                    </div>
                )}

                {/* Bloch Spheres */}
                {blochSpheres.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>🌐 Quantum States</h3>
                        <BlochSpheres spheres={blochSpheres} />
                    </div>
                )}
            </div>

            {/* Results */}
            {results && (
                <div style={{ 
                    background: '#f0fdf4', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem', 
                    marginTop: '2rem',
                    border: '1px solid #bbf7d0'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#166534' }}>📈 Results</h3>
                    <pre style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto' }}>
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </div>
            )}

            {/* Gates List */}
            {gates.length > 0 && (
                <div style={{ 
                    background: '#fef3c7', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem', 
                    marginTop: '2rem',
                    border: '1px solid #fcd34d'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#92400e' }}>🎛️ Current Gates</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {gates.map((gate, index) => (
                            <span key={index} style={{
                                background: '#f59e0b',
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem'
                            }}>
                                {gate.gate.toUpperCase()}({gate.target}{gate.control !== undefined ? `,${gate.control}` : ''})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
