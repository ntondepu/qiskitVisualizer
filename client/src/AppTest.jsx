import { useState } from 'react';

export default function AppTest() {
    const [activeTab, setActiveTab] = useState(0);

    const tabs = [
        { name: 'Dashboard', icon: '📊' },
        { name: 'Circuit Builder', icon: '🔧' }
    ];

    return (
        <div style={{ minHeight: '100vh', padding: '1rem' }}>
            <h1 style={{ textAlign: 'center', color: '#2563eb' }}>🚀 Qiskit Visualizer - Test Version</h1>
            
            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '2rem',
                borderBottom: '2px solid #e5e7eb'
            }}>
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            margin: '0 0.5rem',
                            border: 'none',
                            background: activeTab === index ? '#3b82f6' : 'transparent',
                            color: activeTab === index ? 'white' : '#374151',
                            borderRadius: '0.5rem 0.5rem 0 0',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500'
                        }}
                    >
                        {tab.icon} {tab.name}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                {activeTab === 0 && (
                    <div>
                        <h2>📊 Dashboard</h2>
                        <p>Simple dashboard view - no complex components loaded yet</p>
                        <div style={{ 
                            background: '#f0f9ff', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            margin: '1rem 0'
                        }}>
                            ✅ Basic React rendering working
                        </div>
                    </div>
                )}
                
                {activeTab === 1 && (
                    <div>
                        <h2>🔧 Circuit Builder</h2>
                        <p>Simple circuit builder view - no complex components loaded yet</p>
                        <div style={{ 
                            background: '#f0f9ff', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            margin: '1rem 0'
                        }}>
                            ✅ Tab switching working
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
                Current time: {new Date().toLocaleString()}
            </div>
        </div>
    );
}
