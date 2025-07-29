import React from 'react';

export default function TestComponent() {
    return (
        <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: '#f0f8ff',
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '1.2rem'
        }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '1rem', fontSize: '2.5rem' }}>
                ✅ SUCCESS: React is Working!
            </h1>
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#d4edda',
                borderRadius: '10px',
                border: '3px solid #28a745',
                marginBottom: '2rem'
            }}>
                <p style={{ color: '#155724', margin: 0, fontWeight: 'bold' }}>
                    🎉 TestComponent is rendering properly!
                </p>
            </div>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
                Current time: {new Date().toLocaleString()}
            </p>
            <p style={{ color: '#007bff', fontWeight: 'bold' }}>
                If you can see this message, your React app is working correctly.
            </p>
        </div>
    );
}
