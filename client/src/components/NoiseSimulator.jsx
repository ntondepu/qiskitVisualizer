import { useState } from 'react';

export default function NoiseSimulator() {
  const [noiseConfig, setNoiseConfig] = useState({
    depolarizing: 0.01,
    bit_flip: 0.01
  });
  const [results, setResults] = useState(null);

  const runNoisySimulation = async () => {
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
    }
  };

  return (
    <div className="noise-simulator">
      <h2>Noise Simulation</h2>
      
      <div className="noise-controls">
        <label>
          Depolarizing Error:
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.001"
            value={noiseConfig.depolarizing}
            onChange={(e) => setNoiseConfig({
              ...noiseConfig,
              depolarizing: parseFloat(e.target.value)
            })}
          />
          {noiseConfig.depolarizing.toFixed(3)}
        </label>

        <button onClick={runNoisySimulation}>
          Run Noisy Simulation
        </button>
      </div>

      {results && (
        <div className="results">
          <img src={`data:image/png;base64,${results.histogram}`} alt="Noisy results" />
        </div>
      )}
    </div>
  );
}
