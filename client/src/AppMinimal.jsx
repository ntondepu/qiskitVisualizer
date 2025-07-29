import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2563eb', textAlign: 'center' }}>🚀 Qiskit Visualizer</h1>
      <div style={{ 
        background: '#f0f8ff', 
        padding: '2rem', 
        borderRadius: '8px',
        textAlign: 'center',
        margin: '2rem 0'
      }}>
        <h2>✅ React is Working!</h2>
        <p>This is the absolute minimal version to test if React renders properly.</p>
        <p>Current time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
