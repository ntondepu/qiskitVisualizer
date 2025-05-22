import { useState } from 'react';

export default function Optimizer() {
  const [optimizedCircuit, setOptimizedCircuit] = useState(null);

  const optimize = async () => {
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setOptimizedCircuit(data);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  return (
    <div className="optimizer">
      <h2>Circuit Optimizer</h2>
      <button onClick={optimize}>Optimize Circuit</button>
      
      {optimizedCircuit && (
        <div className="results">
          <h3>Optimized Circuit</h3>
          <pre>{JSON.stringify(optimizedCircuit, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
