import { useState } from 'react';

export default function Optimizer() {
  const [optimizedCircuit, setOptimizedCircuit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [originalMetrics, setOriginalMetrics] = useState(null);
  const [optimizationLevel, setOptimizationLevel] = useState(1);

  const optimize = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: optimizationLevel })
      });
      const data = await response.json();
      setOptimizedCircuit(data.optimized);
      setOriginalMetrics(data.original);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="optimizer">
      <h2>Circuit Optimizer</h2>
      
      <div className="optimization-controls">
        <div className="optimization-level">
          <label>
            Optimization Level:
            <select
              value={optimizationLevel}
              onChange={(e) => setOptimizationLevel(parseInt(e.target.value))}
            >
              <option value="1">Level 1 (Basic)</option>
              <option value="2">Level 2 (Moderate)</option>
              <option value="3">Level 3 (Aggressive)</option>
            </select>
          </label>
        </div>

        <button 
          onClick={optimize}
          disabled={isLoading}
        >
          {isLoading ? 'Optimizing...' : 'Optimize Circuit'}
        </button>
      </div>

      {optimizedCircuit && originalMetrics && (
        <div className="optimization-results">
          <div className="comparison">
            <div className="circuit-metrics">
              <h3>Original Circuit</h3>
              <p>Gate count: {originalMetrics.gate_count}</p>
              <p>Depth: {originalMetrics.depth}</p>
              {originalMetrics.circuit_image && (
                <img 
                  src={`data:image/png;base64,${originalMetrics.circuit_image}`} 
                  alt="Original circuit"
                />
              )}
            </div>

            <div className="optimization-arrow">→</div>

            <div className="circuit-metrics">
              <h3>Optimized Circuit</h3>
              <p>Gate count: {optimizedCircuit.gate_count} ({((1 - optimizedCircuit.gate_count/originalMetrics.gate_count)*100).toFixed(1)}% reduction)</p>
              <p>Depth: {optimizedCircuit.depth} ({((1 - optimizedCircuit.depth/originalMetrics.depth)*100).toFixed(1)}% reduction)</p>
              {optimizedCircuit.circuit_image && (
                <img 
                  src={`data:image/png;base64,${optimizedCircuit.circuit_image}`} 
                  alt="Optimized circuit"
                />
              )}
            </div>
          </div>

          <div className="optimization-details">
            <h3>Optimization Details</h3>
            <ul>
              {optimizedCircuit.optimization_steps?.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
