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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-300">
            Quantum Challenges
          </h1>
          <p className="text-xl text-purple-200">
            Master quantum computing through interactive challenges
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Challenge Selection Panel */}
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Select Challenge
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={currentChallenge || ''}
                onChange={(e) => {
                  setCurrentChallenge(e.target.value);
                  setResults(null);
                  setUserSolution('');
                  setError('');
                }}
                disabled={isLoading || challenges.length === 0}
              >
                <option value="">Choose a challenge...</option>
                {challenges.map(challenge => (
                  <option 
                    key={challenge.id} 
                    value={challenge.id}
                    className={completedChallenges.includes(challenge.id) ? 'bg-green-900' : ''}
                  >
                    {challenge.name} ({challenge.difficulty})
                    {completedChallenges.includes(challenge.id) && ' ✓'}
                  </option>
                ))}
              </select>
            </div>

            {currentChallengeData && (
              <div className="animate-fade-in">
                <div className="mb-4 p-4 bg-gray-700 bg-opacity-60 rounded-xl">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold">{currentChallengeData.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      currentChallengeData.difficulty === 'Beginner' ? 'bg-green-600' :
                      currentChallengeData.difficulty === 'Intermediate' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}>
                      {currentChallengeData.difficulty}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-300">{currentChallengeData.description}</p>
                </div>

                <button
                  className={`w-full mt-2 px-4 py-2 rounded-lg transition-all ${
                    showHint ? 'bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => setShowHint(!showHint)}
                  disabled={isLoading}
                >
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>

                {showHint && (
                  <div className="mt-4 p-4 bg-indigo-900 bg-opacity-40 rounded-xl border border-indigo-700 animate-fade-in">
                    <p className="text-purple-200">{currentChallengeData.hint}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {/* Solution Input */}
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-purple-600 w-2 h-6 rounded-full mr-2"></span>
                Your Solution
              </h3>
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px]"
                value={userSolution}
                onChange={(e) => setUserSolution(e.target.value)}
                placeholder={`Enter gates separated by semicolons (e.g., "H 0; CX 0 1")`}
                disabled={isLoading}
                rows={4}
              />
              
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={submitSolution}
                  disabled={isLoading || !userSolution.trim()}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                    isLoading || !userSolution.trim()
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-purple-500/30'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Submit Solution'
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setUserSolution(currentChallengeData.solution);
                    setError('');
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
                  disabled={isLoading}
                >
                  Show Solution
                </button>
              </div>
            </div>

            {/* Results Display */}
            {results && (
              <div className={`bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 shadow-2xl transition-all ${
                results.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
              }`}>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className={`w-2 h-6 rounded-full mr-2 ${
                    results.correct ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  Results
                </h3>

                {error && (
                  <div className="mb-4 p-4 bg-red-900 bg-opacity-40 rounded-xl border border-red-700">
                    {error}
                  </div>
                )}

                {circuitImage && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-300">Circuit Visualization</h4>
                    <div className="bg-gray-900 p-4 rounded-xl">
                      <img 
                        src={`data:image/png;base64,${circuitImage}`} 
                        alt="Quantum circuit"
                        className="w-full rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {results.bloch_spheres?.length > 0 && (
                    <div className="bg-gray-900 p-4 rounded-xl">
                      <h4 className="text-lg font-medium mb-2 text-gray-300">Qubit States</h4>
                      <BlochSpheres spheres={results.bloch_spheres} />
                    </div>
                  )}

                  {results.counts && (
                    <div className="bg-gray-900 p-4 rounded-xl">
                      <h4 className="text-lg font-medium mb-2 text-gray-300">Measurements (1000 shots)</h4>
                      <HistogramDisplay counts={results.counts} />
                    </div>
                  )}
                </div>

                <div className={`mt-6 p-4 rounded-xl ${
                  results.correct 
                    ? 'bg-green-900 bg-opacity-40 border border-green-700'
                    : 'bg-red-900 bg-opacity-40 border border-red-700'
                }`}>
                  {results.correct ? (
                    <div className="flex items-center">
                      <svg className="h-6 w-6 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-lg">Challenge completed successfully!</span>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <svg className="h-6 w-6 text-red-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div>
                        <p className="text-lg">Not quite right!</p>
                        {results.hint && (
                          <p className="mt-1 text-purple-200">{results.hint}</p>
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
