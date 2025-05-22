import { useState } from 'react';

export default function NoiseSimulator() {
  const [noiseConfig, setNoiseConfig] = useState({
    depolarizing: 0.01,
    bitflip: 0.01,
    measurement: 0.01
  });
  const [results, setResults] = useState(null);

  const handleNoiseChange = (e) => {
    setNoiseConfig({
      ...noiseConfig,
      [e.target.name]: parseFloat(e.target.value)
    });
  };

  const runSimulation = async () => {
    try {
      const response = await fetch('/api/simulate-noise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noiseConfig)
      });
      setResults(await response.json());
    } catch (error) {
      console.error('Noise simulation failed:', error);
    }
  };

  return (
    <div className="noise-simulator">
      <h2>Noise Simulation</h2>
      
      <div className="noise-controls">
        <label>
          Depolarizing Noise:
          <input
            type="range"
            name="depolarizing"
            min="0"
            max="0.1"
            step="0.001"
            value={noiseConfig.depolarizing}
            onChange={handleNoiseChange}
          />
          {noiseConfig.depolarizing}
        </label>
        {/* Add similar controls for other noise types */}
      </div>

      <button onClick={runSimulation}>Simulate Noise</button>

      {results && (
        <div className="results">
          <h3>Results with Noise</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
