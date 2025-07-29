import React from 'react';

export default function Challenges() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>🎯 Quantum Challenges</h1>
            <p>Learn quantum computing through interactive challenges!</p>
            <div style={{ 
                background: '#fef3c7', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                marginTop: '1rem',
                border: '1px solid #fcd34d'
            }}>
                <p>Challenge categories:</p>
                <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                    <li>Beginner Quantum Gates</li>
                    <li>Quantum Algorithms</li>
                    <li>Entanglement Puzzles</li>
                    <li>Advanced Protocols</li>
                </ul>
            </div>
        </div>
    );
}
