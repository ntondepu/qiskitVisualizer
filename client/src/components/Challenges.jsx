import { useState } from 'react';

export default function Challenges() {
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [userSolution, setUserSolution] = useState('');

  const challenges = [
    {
      id: 1,
      name: 'Create Bell State',
      description: 'Construct a circuit that creates a Bell state between qubits 0 and 1',
      solution: 'H 0; CX 0 1'
    },
    // Add more challenges
  ];

  const submitSolution = async () => {
    try {
      const response = await fetch('/api/verify-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: currentChallenge,
          solution: userSolution
        })
      });
      const result = await response.json();
      alert(result.success ? 'Correct!' : 'Try again!');
    } catch (error) {
      console.error('Submission failed:', error);
    }
  };

  return (
    <div className="challenges">
      <h2>Quantum Challenges</h2>
      
      <select 
        value={currentChallenge || ''}
        onChange={(e) => setCurrentChallenge(e.target.value)}
      >
        <option value="">Select a challenge</option>
        {challenges.map(challenge => (
          <option key={challenge.id} value={challenge.id}>
            {challenge.name}
          </option>
        ))}
      </select>

      {currentChallenge && (
        <div className="challenge-details">
          <h3>{challenges.find(c => c.id == currentChallenge).name}</h3>
          <p>{challenges.find(c => c.id == currentChallenge).description}</p>
          
          <textarea
            value={userSolution}
            onChange={(e) => setUserSolution(e.target.value)}
            placeholder="Enter your solution in QASM format"
          />
          
          <button onClick={submitSolution}>Submit Solution</button>
        </div>
      )}
    </div>
  );
}
