import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';
import ResultsViewer from './ResultsViewer';

export default function CircuitBuilder() {
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

  const initializeCircuit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/init-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_qubits: numQubits })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initialize');
      
      setGates([]);
      setResults(null);
      setBlochSpheres(Array(numQubits).fill(null));
      setCircuitImage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addGate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/add-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate: selectedGate,
          target: targetQubit,
          control: ['cx', 'swap'].includes(selectedGate) ? controlQubit : null
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add gate');
      
      setGates(data.gates);
      setBlochSpheres(data.bloch_spheres || []);
      setCircuitImage(data.circuit_image || '');
    } catch (err) {
      setError(err.message);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shots: 1024 })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to run simulation');
      
      setResults({
        counts: data.counts,
        histogram: data.histogram_image
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeCircuit();
  }, [numQubits]);

  return (
    <div className="circuit-builder">
      <h2>Quantum Circuit Builder</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="controls">
        <div className="control-group">
          <label>Number of Qubits:</label>
          <input 
            type="number" 
            value={numQubits}
            onChange={(e) => setNumQubits(Math.max(1, Math.min(10, parseInt(e.target.value) || 2))}
            min="1"
            max="10"
            disabled={isLoading}
          />
        </div>

        <div className="control-group">
          <h3>Add Quantum Gate</h3>
          <select 
            value={selectedGate} 
            onChange={(e) => setSelectedGate(e.target.value)}
            disabled={isLoading}
          >
            <option value="h">H (Hadamard)</option>
            <option value="x">X (Pauli-X)</option>
            <option value="y">Y (Pauli-Y)</option>
            <option value="z">Z (Pauli-Z)</option>
            <option value="cx">CX (CNOT)</option>
            <option value="swap">SWAP</option>
          </select>

          <label>Target Qubit:</label>
          <select
            value={targetQubit}
            onChange={(e) => setTargetQubit(parseInt(e.target.value))}
            disabled={isLoading}
          >
            {Array.from({ length: numQubits }, (_, i) => (
              <option key={`target-${i}`} value={i}>Qubit {i}</option>
            ))}
          </select>

          {['cx', 'swap'].includes(selectedGate) && (
            <>
              <label>Control Qubit:</label>
              <select
                value={controlQubit}
                onChange={(e) => setControlQubit(parseInt(e.target.value))}
                disabled={isLoading}
              >
                {Array.from({ length: numQubits }, (_, i) => (
                  <option 
                    key={`control-${i}`} 
                    value={i} 
                    disabled={i === targetQubit}
                  >
                    Qubit {i}{i === targetQubit ? " (target)" : ""}
                  </option>
                ))}
              </select>
            </>
          )}

          <button onClick={addGate} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Gate'}
          </button>
        </div>

        <div className="control-group">
          <button 
            onClick={runSimulation} 
            disabled={isLoading || gates.length === 0}
          >
            {isLoading ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      <div className="visualization-container">
        {circuitImage && (
          <div className="circuit-preview">
            <h3>Circuit Diagram</h3>
            <img 
              src={`data:image/png;base64,${circuitImage}`} 
              alt="Quantum circuit" 
            />
          </div>
        )}

        <div className="state-visualization">
          <BlochSpheres spheres={blochSpheres} />
        </div>

        {results && (
          <ResultsViewer 
            counts={results.counts} 
            histogram={results.histogram} 
          />
        )}
      </div>
    </div>
  );
}
