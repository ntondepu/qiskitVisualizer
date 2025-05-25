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

  useEffect(() => {
    initializeCircuit();
  }, [numQubits]);

  const initializeCircuit = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/init-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_qubits: numQubits })
      });
      setGates([]);
      setResults(null);
      setBlochSpheres([]);
      setCircuitImage('');
    } catch (error) {
      console.error('Error initializing circuit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addGate = async () => {
    setIsLoading(true);
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
      const data = await response.json();
      setGates(data.circuit.gates);
      setBlochSpheres(data.visualization.bloch_spheres);
      setCircuitImage(data.visualization.circuit_image);
    } catch (error) {
      console.error('Error adding gate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shots: 1024 })
      });
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="circuit-builder">
      <h2>Quantum Circuit Builder</h2>
      
      <div className="controls">
        <div className="qubit-control">
          <label>Number of Qubits:</label>
          <input 
            type="number" 
            value={numQubits}
            onChange={(e) => setNumQubits(Math.max(1, Math.min(10, parseInt(e.target.value))))}
            min="1"
            max="10"
            disabled={isLoading}
          />
        </div>

        <div className="gate-controls">
          <h3>Add Quantum Gates</h3>
          <div className="gate-selection">
            <select value={selectedGate} onChange={(e) => setSelectedGate(e.target.value)}>
              <option value="h">H (Hadamard)</option>
              <option value="x">X (Pauli-X)</option>
              <option value="y">Y (Pauli-Y)</option>
              <option value="z">Z (Pauli-Z)</option>
              <option value="cx">CX (CNOT)</option>
              <option value="swap">SWAP</option>
            </select>

            <select
              value={targetQubit}
              onChange={(e) => setTargetQubit(parseInt(e.target.value))}
            >
              {Array.from({ length: numQubits }, (_, i) => (
                <option key={i} value={i}>Qubit {i}</option>
              ))}
            </select>

            {['cx', 'swap'].includes(selectedGate) && (
              <select
                value={controlQubit}
                onChange={(e) => setControlQubit(parseInt(e.target.value))}
              >
                {Array.from({ length: numQubits }, (_, i) => (
                  <option key={i} value={i} disabled={i === targetQubit}>
                    {i === targetQubit ? `Qubit ${i} (target)` : `Qubit ${i}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button onClick={addGate} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Gate'}
          </button>
        </div>

        <button onClick={runSimulation} disabled={isLoading || gates.length === 0}>
          {isLoading ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {isLoading && <div className="loading-spinner">Processing...</div>}

      <div className="visualization">
        {circuitImage && (
          <div className="circuit-display">
            <h3>Circuit Diagram</h3>
            <img src={`data:image/png;base64,${circuitImage}`} alt="Quantum Circuit" />
          </div>
        )}

        <BlochSpheres spheres={blochSpheres} />
        
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
