import React from 'react';

export default function BlochSpheres({ spheres = [] }) {
    if (spheres && spheres.length > 0) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {spheres.map((sphere, index) => (
                    <div key={index} style={{ textAlign: 'center' }}>
                        <h4>Qubit {index}</h4>
                        <img 
                            src={`data:image/png;base64,${sphere}`} 
                            alt={`Bloch sphere for qubit ${index}`}
                            style={{ 
                                width: '100%', 
                                maxWidth: '200px', 
                                height: 'auto',
                                borderRadius: '0.5rem',
                                border: '2px solid #e2e8f0'
                            }}
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>🌐 Bloch Spheres</h1>
            <p>Quantum state visualizations will appear here!</p>
            <div style={{ 
                background: '#f0f8ff', 
                padding: '2rem', 
                borderRadius: '0.5rem',
                marginTop: '1rem',
                border: '2px dashed #3b82f6'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚛️</div>
                <p style={{ color: '#64748b' }}>
                    Initialize a circuit and add some gates to see Bloch sphere representations of your qubits!
                </p>
            </div>
        </div>
    );
}
