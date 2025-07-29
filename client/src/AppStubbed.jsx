import React, { useState, useEffect } from 'react';

// Simple stub components to isolate the issue
const SimpleStub = ({ name }) => (
    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', margin: '0.5rem' }}>
        <h3>{name} Component</h3>
        <p>✅ {name} loaded successfully</p>
    </div>
);

export default function App() {
    const [activeTab, setActiveTab] = useState(0); // Start with Dashboard

    // Dashboard UI - simplified version
    const Dashboard = () => {
        const [backendStatus, setBackendStatus] = useState('Checking...');
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const fetchData = async () => {
                try {
                    const healthResponse = await fetch('/api/health');
                    const healthData = await healthResponse.json();
                    setBackendStatus(healthData.status === 'healthy' ? 'Connected' : 'Unhealthy');
                } catch (error) {
                    console.log('Health check failed:', error);
                    setBackendStatus('Disconnected');
                } finally {
                    setLoading(false);
                }
            };

            fetchData();
        }, []);

        return (
            <div style={{ padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ 
                        fontSize: '3rem', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                    }}>
                        🚀 Qiskit Visualizer
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                        Build, simulate, and visualize quantum circuits
                    </p>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ color: '#374151', marginBottom: '1rem' }}>🔧 Backend Status</h3>
                        <div style={{
                            padding: '0.75rem',
                            background: backendStatus === 'Connected' ? '#dcfce7' : '#fee2e2',
                            color: backendStatus === 'Connected' ? '#166534' : '#991b1b',
                            borderRadius: '0.5rem',
                            fontWeight: '500'
                        }}>
                            {loading ? '⏳ Checking...' : `${backendStatus === 'Connected' ? '✅' : '❌'} ${backendStatus}`}
                        </div>
                    </div>

                    <SimpleStub name="Bloch Spheres" />
                    <SimpleStub name="Advanced Features" />
                    <SimpleStub name="Challenges" />
                </div>
            </div>
        );
    };

    // Circuit Builder - simplified stub
    const CircuitBuilder = () => {
        return (
            <div style={{ padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ 
                        fontSize: '2.5rem', 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                    }}>
                        🔧 Circuit Builder
                    </h1>
                    <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                        Design and simulate quantum circuits
                    </p>
                </div>

                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb',
                    textAlign: 'center'
                }}>
                    <h3>✅ Circuit Builder Loading Successfully</h3>
                    <p>This proves the basic app structure is working!</p>
                    
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginTop: '2rem'
                    }}>
                        <SimpleStub name="Gate Palette" />
                        <SimpleStub name="Circuit Diagram" />
                        <SimpleStub name="Results Viewer" />
                    </div>
                </div>
            </div>
        );
    };

    const tabs = [
        { name: 'Dashboard', component: Dashboard },
        { name: 'Circuit Builder', component: CircuitBuilder },
    ];

    const TabNavigation = () => (
        <div style={{
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        style={{
                            padding: '1rem 2rem',
                            border: 'none',
                            background: 'transparent',
                            color: activeTab === index ? '#3b82f6' : '#6b7280',
                            borderBottom: activeTab === index ? '3px solid #3b82f6' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== index) {
                                e.target.style.color = '#374151';
                                e.target.style.background = '#f9fafb';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== index) {
                                e.target.style.color = '#6b7280';
                                e.target.style.background = 'transparent';
                            }
                        }}
                    >
                        {index === 0 ? '📊' : '🔧'} {tab.name}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            <TabNavigation />
            
            <main>
                {activeTab === 0 && <Dashboard />}
                {activeTab === 1 && <CircuitBuilder />}
            </main>

            <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                color: '#9ca3af',
                fontSize: '0.875rem'
            }}>
                🚀 Qiskit Visualizer - Full App Structure Test | {new Date().toLocaleString()}
            </div>
        </div>
    );
}
