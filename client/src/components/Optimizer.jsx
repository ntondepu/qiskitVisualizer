import { useState, useEffect } from 'react';

export default function Optimizer() {
  const [optimizedCircuit, setOptimizedCircuit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [originalMetrics, setOriginalMetrics] = useState(null);
  const [optimizationLevel, setOptimizationLevel] = useState(1);
  const [error, setError] = useState(null);
  const [circuitReady, setCircuitReady] = useState(false);

  // Check if circuit exists when component mounts
  useEffect(() => {
    const checkCircuitStatus = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/circuit-status', {
          credentials: 'include' // Important for session cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setCircuitReady(data.hasCircuit);
      } catch (err) {
        console.error('Error checking circuit status:', err);
        setError('Failed to check circuit status');
        setCircuitReady(false);
      }
    };

    checkCircuitStatus();
  }, []);

  const checkCircuitStatus = async () => {
    try {
      const response = await fetch('/api/circuit-status');
      const data = await response.json();
      setCircuitReady(data.hasCircuit);
    } catch (err) {
      console.error('Error checking circuit status:', err);
      setCircuitReady(false);
    }
  };

  const initializeCircuit = async () => {
    try {
      const response = await fetch('/init-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_qubits: 2 }) // Default to 2 qubits
      });
      const data = await response.json();
      if (data.success) {
        setCircuitReady(true);
        setError(null);
        // Add a default gate (Hadamard on qubit 0)
        await fetch('/add-gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gate: 'h', target: 0 })
        });
      } else {
        throw new Error(data.error || 'Failed to initialize circuit');
      }
    } catch (err) {
      setError(err.message);
      console.error('Circuit initialization error:', err);
    }
  };

  const optimize = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    // Use full URL in development
    const apiUrl = import.meta.env.DEV 
      ? 'http://localhost:5001/api/optimize' 
      : '/api/optimize';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for sessions
      body: JSON.stringify({ level: optimizationLevel })
    });

    // First check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    // Then try to parse JSON
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Optimization failed');
    }

    setOptimizedCircuit(data.optimized);
    setOriginalMetrics(data.original);
  } catch (err) {
    console.error('Optimization error:', err);
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="optimizer">
      <h2>Circuit Optimizer</h2>
      
      {error && (
        <div className="error-message">
          {error}
          {!circuitReady && (
            <button onClick={initializeCircuit} className="init-button">
              Initialize Default Circuit
            </button>
          )}
        </div>
      )}

      <div className="optimization-controls">
        <div className="optimization-level">
          <label>
            Optimization Level:
            <select
              value={optimizationLevel}
              onChange={(e) => setOptimizationLevel(parseInt(e.target.value))}
              disabled={!circuitReady}
            >
              <option value="1">Level 1 (Basic)</option>
              <option value="2">Level 2 (Moderate)</option>
              <option value="3">Level 3 (Aggressive)</option>
            </select>
          </label>
        </div>

        <button 
          onClick={optimize}
          disabled={isLoading || !circuitReady}
          className={`optimize-button ${!circuitReady ? 'disabled' : ''}`}
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
                  className="circuit-image"
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
                  className="circuit-image"
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

      <style jsx="true">{`
        .optimizer {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .optimization-controls {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 20px;
        }
        .optimization-level select {
          margin-left: 10px;
          padding: 5px;
        }
        button {
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button.disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        button.init-button {
          margin-left: 10px;
          background: #2196F3;
        }
        .error-message {
          color: #f44336;
          padding: 10px;
          background: #ffebee;
          border-radius: 4px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .optimization-results {
          margin-top: 30px;
        }
        .comparison {
          display: flex;
          gap: 30px;
          margin-bottom: 20px;
        }
        .circuit-metrics {
          flex: 1;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .optimization-arrow {
          display: flex;
          align-items: center;
          font-size: 24px;
          color: #666;
        }
        .circuit-image {
          max-width: 100%;
          margin-top: 10px;
          border: 1px solid #eee;
        }
        .optimization-details ul {
          padding-left: 20px;
        }
      `}</style>
    </div>
  );
}
