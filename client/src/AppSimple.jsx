import React, { useState } from 'react';

export default function AppSimple() {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div style={{ minHeight: '100vh', padding: '1rem' }}>
            <h1 style={{ textAlign: 'center', color: '#2563eb', marginBottom: '2rem' }}>
                🚀 Qiskit Visualizer - Simple Version
            </h1>
            
            {/* Simple Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '2rem',
                gap: '1rem'
            }}>
                <button
                    onClick={() => setActiveTab(0)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: '2px solid #3b82f6',
                        background: activeTab === 0 ? '#3b82f6' : 'white',
                        color: activeTab === 0 ? 'white' : '#3b82f6',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                    }}
                >
                    📊 Dashboard
                </button>
                
                <button
                    onClick={() => setActiveTab(1)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: '2px solid #10b981',
                        background: activeTab === 1 ? '#10b981' : 'white',
                        color: activeTab === 1 ? 'white' : '#10b981',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                    }}
                >
                    🔧 Circuit Builder
                </button>
            </div>

            {/* Tab Content */}
            <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                background: '#f8fafc',
                borderRadius: '1rem',
                margin: '0 auto',
                maxWidth: '600px'
            }}>
                {activeTab === 0 && (
                    <div>
                        <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>� Dashboard</h2>
                        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                            Welcome to the quantum circuit visualizer dashboard
                        </p>
                        <div style={{ 
                            background: '#dcfce7', 
                            border: '1px solid #bbf7d0',
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            color: '#166534'
                        }}>
                            ✅ Dashboard tab is working perfectly!
                        </div>
                    </div>
                )}
                
                {activeTab === 1 && (
                    <div>
                        <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>🔧 Circuit Builder</h2>
                        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                            Design and simulate quantum circuits
                        </p>
                        <div style={{ 
                            background: '#dbeafe', 
                            border: '1px solid #bfdbfe',
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            color: '#1e40af'
                        }}>
                            ✅ Circuit Builder tab is working perfectly!
                        </div>
                    </div>
                )}
            </div>

            <div style={{ 
                textAlign: 'center', 
                marginTop: '2rem', 
                color: '#6b7280',
                fontSize: '0.9rem'
            }}>
                Time: {new Date().toLocaleString()} | Status: Simple app working
            </div>
        </div>
    );
}
