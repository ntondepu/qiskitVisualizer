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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-800 mb-2">Quantum Challenges</h1>
          <p className="text-lg text-indigo-600">
            Test your quantum computing skills by solving these challenges
          </p>
        </div>

        <div className="challenge-selector mb-6">
          <select 
            className="w-full p-3 bg-white border-2 border-indigo-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                className={completedChallenges.includes(challenge.id) ? 'bg-green-100' : ''}
              >
                {challenge.name} ({challenge.difficulty})
                {completedChallenges.includes(challenge.id) && ' ✓'}
              </option>
            ))}
          </select>
        </div>

        {currentChallengeData && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-2 border-indigo-100">
            <div className="challenge-description mb-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-indigo-800">{currentChallengeData.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentChallengeData.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                  currentChallengeData.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentChallengeData.difficulty}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{currentChallengeData.description}</p>
              
              <button 
                className={`px-4 py-2 rounded-lg ${showHint ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-50 text-indigo-700'} border border-indigo-200 hover:bg-indigo-100 transition-colors`}
                onClick={() => setShowHint(!showHint)}
                disabled={isLoading}
              >
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
              
              {showHint && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800">{currentChallengeData.hint}</p>
                </div>
              )}
            </div>

            <div className="solution-section">
              <div className="solution-input mb-6">
                <h4 className="text-lg font-medium text-indigo-800 mb-2">Your Solution:</h4>
                <textarea
                  className="w-full p-3 bg-white border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                  value={userSolution}
                  onChange={(e) => setUserSolution(e.target.value)}
                  placeholder="Enter gates separated by semicolons (e.g., 'H 0; CX 0 1')"
                  disabled={isLoading}
                  rows={4}
                />
                
                <div className="flex flex-wrap gap-3 mt-4">
                  <button 
                    onClick={submitSolution}
                    disabled={isLoading || !userSolution.trim()}
                    className={`px-6 py-2 rounded-lg font-medium ${isLoading || !userSolution.trim() ? 'bg-gray-200 text-gray-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} transition-colors`}
                  >
                    {isLoading ? 'Verifying...' : 'Submit Solution'}
                  </button>
                  
                  <button
                    onClick={() => setUserSolution(currentChallengeData.solution)}
                    className="px-6 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                    disabled={isLoading}
                  >
                    Show Solution
                  </button>
                </div>
              </div>

              {results && (
                <div className={`results-container p-4 rounded-lg ${results.correct ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <h3 className="text-lg font-medium mb-3 text-gray-800">Results</h3>
                  
                  {results.error && (
                    <div className="error-message bg-red-100 text-red-800 p-2 rounded mb-3">
                      {results.error}
                    </div>
                  )}

                  {circuitImage && (
                    <div className="circuit-visualization mb-4 bg-white p-2 rounded border border-gray-200">
                      <h4 className="text-md font-medium mb-2 text-gray-700">Your Circuit:</h4>
                      <img 
                        src={`data:image/png;base64,${circuitImage}`} 
                        alt="Your circuit" 
                        className="w-full rounded"
                      />
                    </div>
                  )}

                  {results.bloch_spheres && (
                    <div className="bloch-spheres mb-4 bg-white p-3 rounded border border-gray-200">
                      <h4 className="text-md font-medium mb-2 text-gray-700">Qubit States:</h4>
                      <BlochSpheres spheres={results.bloch_spheres} />
                    </div>
                  )}

                  {results.counts && (
                    <div className="histogram-results mb-4 bg-white p-3 rounded border border-gray-200">
                      <h4 className="text-md font-medium mb-2 text-gray-700">Measurement Results (1000 shots):</h4>
                      <HistogramDisplay counts={results.counts} />
                    </div>
                  )}

                  <div className={`verification-result p-3 rounded ${results.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {results.correct ? (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Challenge completed successfully!
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Not quite right! {results.hint}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
