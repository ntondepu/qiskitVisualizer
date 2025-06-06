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
      const response = await fetch('/api/noise-simulation', {  // Changed endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Important for session
        body: JSON.stringify({
          shots: 1024,
          depolarizing: noiseConfig.depolarizing,
          bit_flip: noiseConfig.bit_flip,
          phase_flip: noiseConfig.phase_flip
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Simulation failed');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid simulation results');
      }

      setResults(data);
    } catch (error) {
      console.error('Noise simulation error:', error);
      setError(error.message);
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

        {/* Other noise parameter controls remain the same */}

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
            histogram={results.histogram_image}  // Changed to match backend
          />
          <div className="noise-stats">
            <p>Depolarizing: {noiseConfig.depolarizing.toFixed(3)}</p>
            <p>Bit Flip: {noiseConfig.bit_flip.toFixed(3)}</p>
            <p>Phase Flip: {noiseConfig.phase_flip.toFixed(3)}</p>
            {results.fidelity && (
              <p>Fidelity: {(results.fidelity * 100).toFixed(1)}%</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
