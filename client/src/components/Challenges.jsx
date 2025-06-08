import { useState, useEffect } from 'react';
import BlochSpheres from './BlochSpheres';
import HistogramDisplay from './HistogramDisplay';

export default function Challenges() {
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [userSolution, setUserSolution] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [circuitImage, setCircuitImage] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState([]);

  const challenges = [
    {
      id: 1,
      name: 'Create Bell State',
      description: 'Construct a circuit that creates an entangled Bell state between qubits 0 and 1 (|00⟩ + |11⟩)/√2',
      solution: 'H 0; CX 0 1',
      difficulty: 'Beginner',
      hint: 'Start by putting the first qubit in superposition, then entangle it with the second'
    },
    {
      id: 2,
      name: 'GHZ State',
      description: 'Create a 3-qubit GHZ state (|000⟩ + |111⟩)/√2',
      solution: 'H 0; CX 0 1; CX 0 2',
      difficulty: 'Intermediate',
      hint: 'Extend the Bell state concept to three qubits'
    },
    {
      id: 3,
      name: 'Superposition',
      description: 'Put a single qubit in superposition state (|0⟩ + |1⟩)/√2',
      solution: 'H 0',
      difficulty: 'Beginner',
      hint: 'You only need one gate for this challenge'
    },
    {
      id: 4,
      name: 'Entangled State',
      description: 'Create an entangled state where |01⟩ and |10⟩ are equally likely',
      solution: 'H 0; CX 0 1; X 1',
      difficulty: 'Advanced',
      hint: 'Create entanglement then flip one qubit'
    }
  ];

  const submitSolution = async () => {
    if (!userSolution.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/verify-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: currentChallenge,
          solution: userSolution
        })
      });
      const data = await response.json();
      
      if (data.success && data.correct) {
        setCompletedChallenges(prev => [...new Set([...prev, currentChallenge])]);
      }
      
      setResults(data);
      if (data.circuit_image) {
        setCircuitImage(data.circuit_image);
      }
    } catch (error) {
      console.error('Submission failed:', error);
      setResults({
        success: false,
        error: 'Failed to verify solution'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentChallengeData = challenges.find(c => c.id == currentChallenge);

  return (
    <div className="challenges-container">
      <h2>Quantum Challenges</h2>
      <p className="subtitle">Test your quantum computing skills by solving these challenges</p>
      
      <div className="challenge-selector">
        <select 
          value={currentChallenge || ''}
          onChange={(e) => {
            setCurrentChallenge(e.target.value);
            setResults(null);
            setUserSolution('');
          }}
          disabled={isLoading}
        >
          <option value="">Select a challenge</option>
          {challenges.map(challenge => (
            <option 
              key={challenge.id} 
              value={challenge.id}
              className={completedChallenges.includes(challenge.id) ? 'completed' : ''}
            >
              {challenge.name} ({challenge.difficulty})
              {completedChallenges.includes(challenge.id) && ' ✓'}
            </option>
          ))}
        </select>
      </div>

      {currentChallengeData && (
        <div className="challenge-workspace">
          <div className="challenge-description">
            <h3>{currentChallengeData.name}</h3>
            <div className="difficulty-badge">{currentChallengeData.difficulty}</div>
            <p>{currentChallengeData.description}</p>
            
            <button 
              className="hint-button"
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            
            {showHint && (
              <div className="hint-box">
                <p>{currentChallengeData.hint}</p>
              </div>
            )}
          </div>

          <div className="solution-section">
            <div className="solution-input">
              <h4>Your Solution:</h4>
              <textarea
                value={userSolution}
                onChange={(e) => setUserSolution(e.target.value)}
                placeholder="Enter gates separated by semicolons (e.g., 'H 0; CX 0 1')"
                disabled={isLoading}
                rows={4}
              />
              
              <div className="button-group">
                <button 
                  onClick={submitSolution}
                  disabled={isLoading || !userSolution.trim()}
                  className="submit-button"
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    'Submit Solution'
                  )}
                </button>
                
                <button
                  onClick={() => setUserSolution(currentChallengeData.solution)}
                  className="show-solution-button"
                >
                  Show Solution
                </button>
              </div>
            </div>

            {results && (
              <div className={`results-container ${results.correct ? 'success' : 'failure'}`}>
                <h3>Results</h3>
                
                {results.error && (
                  <div className="error-message">{results.error}</div>
                )}

                {circuitImage && (
                  <div className="circuit-visualization">
                    <h4>Your Circuit:</h4>
                    <img 
                      src={`data:image/png;base64,${circuitImage}`} 
                      alt="Your circuit" 
                    />
                  </div>
                )}

                {results.bloch_spheres && (
                  <div className="bloch-spheres">
                    <h4>Qubit States:</h4>
                    <BlochSpheres spheres={results.bloch_spheres} />
                  </div>
                )}

                {results.counts && (
                  <div className="histogram-results">
                    <h4>Measurement Results (1000 shots):</h4>
                    <HistogramDisplay counts={results.counts} />
                  </div>
                )}

                {results.success && (
                  <div className="verification-result">
                    {results.correct ? (
                      <div className="success-message">
                        ✅ Challenge completed successfully!
                      </div>
                    ) : (
                      <div className="failure-message">
                        ❌ Not quite right! {results.hint}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
