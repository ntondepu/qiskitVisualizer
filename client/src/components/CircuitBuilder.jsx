import { useState } from 'react';
import BlochSpheres from './BlochSpheres';
import ResultsViewer from './ResultsViewer';

export default function CircuitBuilder() {
  const [numQubits, setNumQubits] = useState(2);
  const [gates, setGates] = useState([]);
  const [results, setResults] = useState(null);
  const [blochSpheres, setBlochSpheres] = useState([]);
  const [circuitImage, setCircuitImage] = useState('');

  const addGate = async (type, target, control = null) => {
    try {
      const response = await fetch('/api/add-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          target,
          control
        })
      });
      const data = await response.json();
      setGates(data.circuit.gates);
      setBlochSpheres(data.visualization.bloch_spheres);
      setCircuitImage(data.visualization.circuit_image);
    } catch (error) {
      console.error('Error adding gate:', error);
    }
  };

  const runSimulation = async () => {
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
            onChange={(e) => setNumQubits(Math.max(1, Math.min(10, parseInt(e.target.value)))}
            min="1"
            max="10"
          />
          <button onClick={() => fetch('/api/init-circuit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ num_qubits: numQubits })
          })}>Initialize Circuit</button>
        </div>

        <div className="gate-controls">
          <h3>Add Quantum Gates</h3>
          <div className="gate-buttons">
            <button onClick={() => addGate('h', 0)}>H (Q0)</button>
            <button onClick={() => addGate('x', 0)}>X (Q0)</button>
            <button onClick={() => addGate('cx', 1, 0)}>CX (0→1)</button>
            
          </div>
        </div>

        <button className="simulate-btn" onClick={runSimulation}>
          Run Simulation
        </button>
      </div>

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
