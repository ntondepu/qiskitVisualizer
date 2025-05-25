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

  const runNoisySimulation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shots: 1024,
          noise: noiseConfig
        })
      });
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Error running noisy simulation:', error);
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
        >
          {isLoading ? 'Simulating...' : 'Run Noisy Simulation'}
        </button>
      </div>

      {results && (
        <div className="noise-results">
          <ResultsViewer 
            counts={results.counts} 
            histogram={results.histogram} 
          />
          <div className="noise-analysis">
            <h3>Noise Analysis</h3>
            <p>Total error rate: {(noiseConfig.depolarizing + noiseConfig.bit_flip + noiseConfig.phase_flip).toFixed(3)}</p>
            {results.fidelity && <p>Circuit fidelity: {results.fidelity.toFixed(3)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
