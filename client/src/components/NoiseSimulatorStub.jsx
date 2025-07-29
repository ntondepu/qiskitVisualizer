import React from 'react';

export default function NoiseSimulator() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>🔬 Noise Simulator</h1>
            <p>Simulate realistic quantum noise and decoherence effects!</p>
            <div style={{ 
                background: '#f0fdf4', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                marginTop: '1rem',
                border: '1px solid #bbf7d0'
            }}>
                <p>Noise modeling features:</p>
                <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                    <li>Decoherence Simulation</li>
                    <li>Gate Error Modeling</li>
                    <li>Measurement Errors</li>
                    <li>Environmental Noise</li>
                </ul>
            </div>
        </div>
    );
}
