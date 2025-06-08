import { useState } from 'react';
import ResultsViewer from './ResultsViewer';

export default function NoiseSimulator() {
  const [noiseConfig, setNoiseConfig] = useState({
    depolarizing: 0.01,
    bit_flip: 0.01,
    phase_flip: 0.01,
    shots: 1024
  });
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runNoisySimulation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if circuit exists
      const circuitCheck = await fetch('http://localhost:5001/api/circuit-status', {
        credentials: 'include'
      });
      
      if (!circuitCheck.ok) {
        throw new Error('Failed to check circuit status');
      }
      
      const circuitData = await circuitCheck.json();
      
      if (!circuitData.success) {
        throw new Error(circuitData.error || 'Failed to check circuit');
      }
      
      if (!circuitData.hasCircuit) {
        throw new Error('Please build or upload a circuit first');
      }

      // Then run simulation
      const response = await fetch('http://localhost:5001/api/noise-simulation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          shots: noiseConfig.shots,
          noise: {
            depolarizing: noiseConfig.depolarizing,
            bit_flip: noiseConfig.bit_flip,
            phase_flip: noiseConfig.phase_flip
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Simulation failed');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Simulation failed');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
      console.error('Noise simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParameterChange = (param, value) => {
    setNoiseConfig({
      ...noiseConfig,
      [param]: Math.min(0.2, Math.max(0, parseFloat(value) || 0))
    });
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
              onChange={(e) => handleParameterChange('depolarizing', e.target.value)}
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
              onChange={(e) => handleParameterChange('bit_flip', e.target.value)}
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
              onChange={(e) => handleParameterChange('phase_flip', e.target.value)}
            />
          </label>
        </div>

        <div className="shots-control">
          <label>
            Shots:
            <input
              type="number"
              min="1"
              max="10000"
              value={noiseConfig.shots}
              onChange={(e) => handleParameterChange('shots', e.target.value)}
            />
          </label>
        </div>

        <button 
          onClick={runNoisySimulation}
          disabled={isLoading}
          className={`simulate-btn ${isLoading ? 'loading' : ''}`}
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
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
      </div>

      {results && (
        <div className="noise-results">
          <h3>Simulation Results</h3>
          <div className="results-grid">
            <div className="histogram-view">
              <ResultsViewer 
                counts={results.counts} 
                histogram={results.histogram_image}
              />
            </div>
            
            <div className="noise-stats">
              <h4>Noise Parameters</h4>
              <ul>
                <li>Depolarizing: {results.noise_parameters.depolarizing.toFixed(3)}</li>
                <li>Bit Flip: {results.noise_parameters.bit_flip.toFixed(3)}</li>
                <li>Phase Flip: {results.noise_parameters.phase_flip.toFixed(3)}</li>
              </ul>
              
              {results.fidelity !== undefined && (
                <>
                  <h4>Circuit Fidelity</h4>
                  <div className="fidelity-display">
                    <div 
                      className="fidelity-bar"
                      style={{ width: `${results.fidelity * 100}%` }}
                    ></div>
                    <span>{(results.fidelity * 100).toFixed(1)}%</span>
                  </div>
                  <p className="fidelity-help">
                    Fidelity measures how close the noisy state is to the ideal state (1.0 = perfect).
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
