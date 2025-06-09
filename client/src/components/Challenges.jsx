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
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 border-b-2 border-purple-200 pb-6">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">Quantum Challenges</h1>
          <p className="text-lg text-purple-600">
            Test your quantum computing skills through practical exercises
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Challenge Selection */}
          <div className="w-full lg:w-1/3 bg-white rounded-lg border-2 border-purple-100 shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-4">Select Challenge</h2>
              <select
                className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                value={currentChallenge || ''}
                onChange={(e) => {
                  setCurrentChallenge(e.target.value);
                  setResults(null);
                  setUserSolution('');
                  setError('');
                }}
                disabled={isLoading}
              >
                <option value="">Choose a challenge...</option>
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
              <div className="bg-purple-50 border-2 border-purple-100 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-purple-800">
                    {currentChallengeData.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    currentChallengeData.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    currentChallengeData.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentChallengeData.difficulty}
                  </span>
                </div>
                <p className="text-purple-700 mb-4">{currentChallengeData.description}</p>
                
                <button
                  className={`w-full py-2 px-4 rounded-lg border-2 ${
                    showHint ? 'border-purple-300 bg-purple-50' : 'border-purple-200 hover:bg-purple-50'
                  } text-purple-700 font-medium transition-colors`}
                  onClick={() => setShowHint(!showHint)}
                  disabled={isLoading}
                >
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>

                {showHint && (
                  <div className="mt-3 p-3 bg-purple-100 border-2 border-purple-200 rounded-lg">
                    <p className="text-purple-800">{currentChallengeData.hint}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Workspace */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* Solution Input */}
            <div className="bg-white rounded-lg border-2 border-purple-100 shadow-md p-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-4">Your Solution</h2>
              <textarea
                className="w-full p-4 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 min-h-[150px] font-mono"
                value={userSolution}
                onChange={(e) => setUserSolution(e.target.value)}
                placeholder="Enter gates separated by semicolons (e.g., 'H 0; CX 0 1')"
                disabled={isLoading}
                rows={5}
              />
              
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={submitSolution}
                  disabled={isLoading || !userSolution.trim()}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium border-2 ${
                    isLoading || !userSolution.trim()
                      ? 'border-gray-300 bg-gray-100 text-gray-500'
                      : 'border-purple-600 bg-purple-600 hover:bg-purple-700 text-white'
                  } transition-colors`}
                >
                  {isLoading ? 'Verifying...' : 'Submit Solution'}
                </button>
                
                <button
                  onClick={() => {
                    setUserSolution(currentChallengeData.solution);
                    setError('');
                  }}
                  className="py-3 px-6 border-2 border-purple-300 bg-white hover:bg-purple-50 text-purple-700 rounded-lg font-medium transition-colors"
                  disabled={isLoading}
                >
                  Show Solution
                </button>
              </div>
            </div>

            {/* Results Display */}
            {results && (
              <div className={`bg-white rounded-lg border-2 ${
                results.correct ? 'border-green-300' : 'border-red-300'
              } shadow-md p-6`}>
                <h2 className="text-xl font-semibold text-purple-800 mb-4">Results</h2>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border-2 border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {circuitImage && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-purple-700 mb-2">Circuit Visualization</h3>
                    <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <img 
                        src={`data:image/png;base64,${circuitImage}`} 
                        alt="Quantum circuit"
                        className="w-full rounded"
                      />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {results.bloch_spheres?.length > 0 && (
                    <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <h3 className="text-lg font-medium text-purple-700 mb-2">Qubit States</h3>
                      <BlochSpheres spheres={results.bloch_spheres} />
                    </div>
                  )}

                  {results.counts && (
                    <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <h3 className="text-lg font-medium text-purple-700 mb-2">Measurements (1000 shots)</h3>
                      <HistogramDisplay counts={results.counts} />
                    </div>
                  )}
                </div>

                <div className={`mt-6 p-4 rounded-lg border-2 ${
                  results.correct 
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}>
                  {results.correct ? (
                    <div className="flex items-center text-green-800">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Challenge completed successfully!</span>
                    </div>
                  ) : (
                    <div className="flex items-start text-red-800">
                      <svg className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div>
                        <p className="font-medium">Not quite right!</p>
                        {results.hint && (
                          <p className="mt-1 text-purple-700">{results.hint}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
