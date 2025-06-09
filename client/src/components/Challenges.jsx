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
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/challenges');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.success) {
          setChallenges(data.challenges);
        } else {
          setError('Failed to load challenges from server');
        }
      } catch (err) {
        setError(`Failed to connect to server: ${err.message}`);
        console.error('Fetch error:', err);
      }
    };
    fetchChallenges();
  }, []);

  const submitSolution = async () => {
    if (!userSolution.trim()) {
      setError('Please enter a solution');
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5001/api/verify-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: currentChallenge,
          solution: userSolution
        })
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Verification failed');
      }

      if (data.correct) {
        setCompletedChallenges(prev => [...new Set([...prev, currentChallenge])]);
      }
      
      setResults(data);
      setCircuitImage(data.circuit_image || '');
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Submission failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChallengeData = challenges.find(c => c.id == currentChallenge);

return (
    <div className="challenges-container">
      <h2>Quantum Challenges</h2>
      <p className="subtitle">Test your quantum computing skills by solving these challenges</p>
      
      {error && <div className="error-message">{error}</div>}

      <div className="challenge-selector">
        <select 
          value={currentChallenge || ''}
          onChange={(e) => {
            setCurrentChallenge(e.target.value);
            setResults(null);
            setUserSolution('');
            setError('');
          }}
          disabled={isLoading || challenges.length === 0}
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
            <div className={`difficulty-badge ${
              currentChallengeData.difficulty === 'Beginner' ? 'beginner' :
              currentChallengeData.difficulty === 'Intermediate' ? 'intermediate' : 'advanced'
            }`}>
              {currentChallengeData.difficulty}
            </div>
            <p>{currentChallengeData.description}</p>
            
            <button 
              className="hint-button"
              onClick={() => setShowHint(!showHint)}
              disabled={isLoading}
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
                placeholder={`Enter gates separated by semicolons (e.g., "${currentChallengeData.solution}")`}
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
                  onClick={() => {
                    setUserSolution(currentChallengeData.solution);
                    setError('');
                  }}
                  className="show-solution-button"
                  disabled={isLoading}
                >
                  Show Solution
                </button>
              </div>
            </div>

            {results && (
              <div className={`results-container ${results.correct ? 'success' : 'failure'}`}>
                <h3>Results</h3>
                
                {circuitImage && (
                  <div className="circuit-visualization">
                    <h4>Your Circuit:</h4>
                    <img 
                      src={`data:image/png;base64,${circuitImage}`} 
                      alt="Quantum circuit diagram"
                      onError={() => setError('Failed to load circuit image')}
                    />
                  </div>
                )}

                {results.bloch_spheres?.length > 0 && (
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

                <div className="verification-result">
                  {results.correct ? (
                    <div className="success-message">
                      ✅ Challenge completed successfully!
                    </div>
                  ) : (
                    <div className="failure-message">
                      ❌ Not quite right! {results.hint || 'Try again.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
