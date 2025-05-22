
import { useState } from 'react';

export default function CircuitBuilder() {
  const [numQubits, setNumQubits] = useState(2);
  const [gates, setGates] = useState([]);
  const [measure, setMeasure] = useState(false);

  const addGate = (type, target, control = null) => {
    setGates([...gates, { type, target, control }]);
  };

  const simulateCircuit = async () => {
    try {
      const response = await fetch('/api/build-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_qubits: numQubits,
          gates,
          measure
        })
      });
      const data = await response.json();
      console.log('Simulation results:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="circuit-builder">
      <h2>Circuit Builder</h2>
      
      <div className="controls">
        <label>
          Number of Qubits:
          <input 
            type="number" 
            value={numQubits}
            onChange={(e) => setNumQubits(parseInt(e.target.value))}
            min="1" 
            max="10" 
          />
        </label>

        <div className="gate-controls">
          <h3>Add Gates</h3>
          {/* Example gate adder - expand as needed */}
          <button onClick={() => addGate('H', 0)}>Add H Gate (Qubit 0)</button>
          <button onClick={() => addGate('CX', 1, 0)}>Add CX (0→1)</button>
        </div>

        <label>
          <input 
            type="checkbox" 
            checked={measure}
            onChange={(e) => setMeasure(e.target.checked)}
          />
          Add Measurement
        </label>

        <button onClick={simulateCircuit}>Run Simulation</button>
      </div>

      <div className="circuit-display">
        <h3>Current Circuit:</h3>
        <pre>{JSON.stringify(gates, null, 2)}</pre>
      </div>
    </div>
  );
}
