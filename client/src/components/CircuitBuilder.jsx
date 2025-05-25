import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';

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

  useEffect(() => {
    initializeCircuit();
  }, [numQubits]);

  const initializeCircuit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/init-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_qubits: numQubits })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize circuit');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setGates([]);
      setResults(null);
      setBlochSpheres([]);
      setCircuitImage('');
    } catch (err) {
      setError(err.message);
      console.error('Error initializing circuit:', err);
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
          type: selectedGate,
          target: targetQubit,
          control: ['cx', 'swap'].includes(selectedGate) ? controlQubit : null
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add gate');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setGates(data.circuit.gates);
      setBlochSpheres(data.visualization.bloch_spheres);
      setCircuitImage(data.visualization.circuit_image);
    } catch (err) {
      setError(err.message);
      console.error('Error adding gate:', err);
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
      
      if (!response.ok) {
        throw new Error('Failed to run simulation');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setResults(data.results);
    } catch (err) {
      setError(err.message);
      console.error('Error running simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
            onChange={(e) => {
              const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 2));
              setNumQubits(value);
            }}
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

          <button 
            onClick={addGate} 
            disabled={isLoading}
            className="action-button"
          >
            {isLoading ? 'Adding...' : 'Add Gate'}
          </button>
        </div>

        <div className="control-group">
          <button 
            onClick={runSimulation} 
            disabled={isLoading || gates.length === 0}
            className="action-button"
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
              className="circuit-image"
            />
          </div>
        )}

        <div className="state-visualization">
          <h3>Qubit States</h3>
          <BlochSpheres spheres={blochSpheres} />
        </div>

        {results && (
          <div className="results-viewer">
            <h3>Measurement Results</h3>
            <div className="histogram">
              {Object.entries(results.counts).map(([state, count]) => (
                <div key={state} className="histogram-bar">
                  <div 
                    className="bar" 
                    style={{ height: `${(count / 1024) * 100}%` }}
                  ></div>
                  <span className="state-label">{state}</span>
                  <span className="count-label">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
