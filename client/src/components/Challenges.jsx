import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';

export default function Challenges() {
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [userSolution, setUserSolution] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [circuitImage, setCircuitImage] = useState('');

  const challenges = [
    {
      id: 1,
      name: 'Create Bell State',
      description: 'Construct a circuit that creates an entangled Bell state between qubits 0 and 1',
      solution: 'H 0; CX 0 1',
      expectedResult: { '00': 500, '11': 500 }
    },
    {
      id: 2,
      name: 'GHZ State',
      description: 'Create a 3-qubit GHZ state (|000⟩ + |111⟩)/√2',
      solution: 'H 0; CX 0 1; CX 0 2',
      expectedResult: { '000': 500, '111': 500 }
    }
  ];

  const submitSolution = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/verify-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: currentChallenge,
          solution: userSolution
        })
      });
      const data = await response.json();
      setResults(data);
      setCircuitImage(data.circuit_image);
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChallengeData = challenges.find(c => c.id == currentChallenge);

  return (
    <div className="challenges">
      <h2>Quantum Challenges</h2>
      
      <div className="challenge-selector">
        <select 
          value={currentChallenge || ''}
          onChange={(e) => {
            setCurrentChallenge(e.target.value);
            setResults(null);
          }}
          disabled={isLoading}
        >
          <option value="">Select a challenge</option>
          {challenges.map(challenge => (
            <option key={challenge.id} value={challenge.id}>
              {challenge.name}
            </option>
          ))}
        </select>
      </div>

      {currentChallengeData && (
        <div className="challenge-container">
          <div className="challenge-details">
            <h3>{currentChallengeData.name}</h3>
            <p>{currentChallengeData.description}</p>
            
            <div className="solution-input">
              <textarea
                value={userSolution}
                onChange={(e) => setUserSolution(e.target.value)}
                placeholder="Enter your solution (e.g., 'H 0; CX 0 1')"
                disabled={isLoading}
              />
              
              <button 
                onClick={submitSolution}
                disabled={isLoading || !userSolution.trim()}
              >
                {isLoading ? 'Verifying...' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {results && (
            <div className="challenge-results">
              <h3>Results</h3>
              {circuitImage && (
                <img 
                  src={`data:image/png;base64,${circuitImage}`} 
                  alt="Challenge circuit" 
                  className="circuit-image"
                />
              )}
              
              {results.bloch_spheres && (
                <BlochSpheres spheres={results.bloch_spheres} />
              )}

              {results.counts && (
                <div className="results-comparison">
                  <div className="result-column">
                    <h4>Your Results</h4>
                    <pre>{JSON.stringify(results.counts, null, 2)}</pre>
                  </div>
                  <div className="result-column">
                    <h4>Expected</h4>
                    <pre>{JSON.stringify(currentChallengeData.expectedResult, null, 2)}</pre>
                  </div>
                </div>
              )}

              {results.success ? (
                <div className="success-message">✅ Challenge completed successfully!</div>
              ) : (
                <div className="hint-message">
                  {results.hint || 'Try again! Check the expected output pattern.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
