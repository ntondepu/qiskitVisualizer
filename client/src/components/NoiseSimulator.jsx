import { useState } from 'react';
import ResultsViewer from './ResultsViewer';

export default function NoiseSimulator() {
  const [noiseConfig, setNoiseConfig] = useState({
    depolarizing: 0.01,
    bit_flip: 0.01,
    phase_flip: 0.01
  });
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runNoisySimulation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if circuit exists
      const circuitCheck = await fetch('/api/circuit-status', {
        credentials: 'include'
      });
      const circuitData = await circuitCheck.json();
      
      if (!circuitData.hasCircuit) {
        throw new Error('Please build a circuit first');
      }

      // Then run simulation
      const response = await fetch('/api/noise-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shots: 1024,
          noise: {
            depolarizing: noiseConfig.depolarizing,
            bit_flip: noiseConfig.bit_flip,
            phase_flip: noiseConfig.phase_flip
          }
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Simulation failed');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
      console.error('Simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="noise-simulator">
      <h2>Noise Simulation</h2>
      
      <div className="noise-controls">
        <div className="noise-parameter">
          <label>
            Depolarizing Error: {noiseConfig.depolarizing.toFixed(3)}
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.001"
              value={noiseConfig.depolarizing}
              onChange={(e) => setNoiseConfig({
                ...noiseConfig,
                depolarizing: parseFloat(e.target.value)
              })}
            />
          </label>
        </div>

        <div className="noise-parameter">
          <label>
            Bit Flip Error: {noiseConfig.bit_flip.toFixed(3)}
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.001"
              value={noiseConfig.bit_flip}
              onChange={(e) => setNoiseConfig({
                ...noiseConfig,
                bit_flip: parseFloat(e.target.value)
              })}
            />
          </label>
        </div>

        <div className="noise-parameter">
          <label>
            Phase Flip Error: {noiseConfig.phase_flip.toFixed(3)}
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.001"
              value={noiseConfig.phase_flip}
              onChange={(e) => setNoiseConfig({
                ...noiseConfig,
                phase_flip: parseFloat(e.target.value)
              })}
            />
          </label>
        </div>

        <button 
          onClick={runNoisySimulation}
          disabled={isLoading}
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Simulating...
            </>
          ) : 'Run Noisy Simulation'}
        </button>

        {error && (
          <div className="error-message">
            Error: {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
      </div>

      {results && (
        <div className="noise-results">
          <h3>Simulation Results</h3>
          <ResultsViewer 
            counts={results.counts} 
            histogram={results.histogram_image}
          />
          <div className="noise-stats">
            <p>Depolarizing: {results.noise_parameters.depolarizing.toFixed(3)}</p>
            <p>Bit Flip: {results.noise_parameters.bit_flip.toFixed(3)}</p>
            <p>Phase Flip: {results.noise_parameters.phase_flip.toFixed(3)}</p>
            {results.fidelity && (
              <p>Fidelity: {(results.fidelity * 100).toFixed(1)}%</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
