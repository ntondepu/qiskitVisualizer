import React, { useState, useEffect } from 'react';

const IBMQuantumIntegration = ({ onDeviceSelect, selectedDevice }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Mock IBM Quantum devices data (in real implementation, this would come from IBM Quantum API)
  const mockDevices = [
    {
      id: 'ibm_cairo',
      name: 'ibm_cairo',
      qubits: 27,
      status: 'active',
      pending_jobs: 42,
      basis_gates: ['id', 'rz', 'sx', 'x', 'cx', 'reset'],
      coupling_map: [[0, 1], [1, 2], [1, 4], [2, 3], [4, 7]],
      t1_times: [89.2, 76.5, 92.1, 67.8, 88.9], // μs
      t2_times: [45.6, 38.2, 47.3, 34.1, 42.7], // μs
      readout_error: [0.012, 0.018, 0.009, 0.021, 0.015],
      gate_error: {
        'sx': [0.0003, 0.0004, 0.0002, 0.0005, 0.0003],
        'cx': [0.008, 0.012, 0.007, 0.015, 0.009]
      },
      calibration_time: '2025-07-13T14:30:00Z'
    },
    {
      id: 'ibm_sherbrooke',
      name: 'ibm_sherbrooke',
      qubits: 127,
      status: 'active',
      pending_jobs: 156,
      basis_gates: ['id', 'rz', 'sx', 'x', 'cx', 'reset'],
      coupling_map: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
      t1_times: [95.7, 82.3, 89.4, 76.1, 91.8],
      t2_times: [48.2, 41.7, 44.9, 38.6, 46.3],
      readout_error: [0.008, 0.012, 0.006, 0.014, 0.009],
      gate_error: {
        'sx': [0.0002, 0.0003, 0.0001, 0.0004, 0.0002],
        'cx': [0.005, 0.008, 0.004, 0.010, 0.006]
      },
      calibration_time: '2025-07-13T15:15:00Z'
    },
    {
      id: 'simulator_statevector',
      name: 'Statevector Simulator',
      qubits: 32,
      status: 'active',
      pending_jobs: 0,
      basis_gates: ['u1', 'u2', 'u3', 'cx', 'id', 'snapshot'],
      coupling_map: 'all-to-all',
      t1_times: null,
      t2_times: null,
      readout_error: null,
      gate_error: null,
      calibration_time: null,
      is_simulator: true
    }
  ];

  useEffect(() => {
    // Simulate loading devices
    setLoading(true);
    setTimeout(() => {
      setDevices(mockDevices);
      setLoading(false);
    }, 1000);
  }, []);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your IBM Quantum API key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would authenticate with IBM Quantum
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError('Failed to connect to IBM Quantum. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setApiKey('');
    onDeviceSelect(null);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return new Date(timeStr).toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'maintenance': return '#ff9800';
      case 'offline': return '#f44336';
      default: return '#666';
    }
  };

  return (
    <div className="ibm-quantum-integration">
      <div className="integration-header">
        <h3>🚀 IBM Quantum Hardware Integration</h3>
        <p>Connect to real quantum computers and advanced simulators</p>
      </div>

      {!isConnected ? (
        <div className="connection-setup">
          <div className="api-key-section">
            <label htmlFor="apiKey">IBM Quantum API Key:</label>
            <div className="api-input-group">
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your IBM Quantum API key..."
                className="api-key-input"
              />
              <button 
                onClick={handleConnect}
                disabled={loading || !apiKey.trim()}
                className="connect-btn"
              >
                {loading ? '🔄 Connecting...' : '🔗 Connect'}
              </button>
            </div>
            <div className="api-help">
              <p>
                📝 Get your free API key from{' '}
                <a 
                  href="https://quantum-computing.ibm.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  IBM Quantum Experience
                </a>
              </p>
            </div>
          </div>

          {error && (
            <div className="connection-error">
              <span>⚠️ {error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="connected-view">
          <div className="connection-status">
            <div className="status-indicator">
              <div className="status-dot connected"></div>
              <span>Connected to IBM Quantum</span>
            </div>
            <button onClick={handleDisconnect} className="disconnect-btn">
              Disconnect
            </button>
          </div>

          <div className="devices-section">
            <h4>Available Quantum Devices</h4>
            
            {loading ? (
              <div className="devices-loading">
                <div className="spinner"></div>
                <span>Loading quantum devices...</span>
              </div>
            ) : (
              <div className="devices-grid">
                {devices.map((device) => (
                  <div 
                    key={device.id}
                    className={`device-card ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                    onClick={() => onDeviceSelect(device)}
                  >
                    <div className="device-header">
                      <div className="device-name">
                        <h5>{device.name}</h5>
                        <div 
                          className="device-status"
                          style={{ color: getStatusColor(device.status) }}
                        >
                          ● {device.status}
                        </div>
                      </div>
                      {device.is_simulator && (
                        <div className="simulator-badge">Simulator</div>
                      )}
                    </div>

                    <div className="device-specs">
                      <div className="spec-item">
                        <span className="spec-label">Qubits:</span>
                        <span className="spec-value">{device.qubits}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Queue:</span>
                        <span className="spec-value">{device.pending_jobs} jobs</span>
                      </div>
                      {device.t1_times && (
                        <div className="spec-item">
                          <span className="spec-label">Avg T₁:</span>
                          <span className="spec-value">
                            {(device.t1_times.reduce((a, b) => a + b, 0) / device.t1_times.length).toFixed(1)} μs
                          </span>
                        </div>
                      )}
                      {device.calibration_time && (
                        <div className="spec-item">
                          <span className="spec-label">Last Calibrated:</span>
                          <span className="spec-value">{formatTime(device.calibration_time)}</span>
                        </div>
                      )}
                    </div>

                    {selectedDevice?.id === device.id && !device.is_simulator && (
                      <div className="device-details">
                        <div className="error-rates">
                          <h6>Error Rates</h6>
                          <div className="error-grid">
                            <div className="error-item">
                              <span>Readout:</span>
                              <span>{(device.readout_error.reduce((a, b) => a + b, 0) / device.readout_error.length * 100).toFixed(3)}%</span>
                            </div>
                            <div className="error-item">
                              <span>Single Gate:</span>
                              <span>{(device.gate_error.sx.reduce((a, b) => a + b, 0) / device.gate_error.sx.length * 100).toFixed(3)}%</span>
                            </div>
                            <div className="error-item">
                              <span>Two Gate:</span>
                              <span>{(device.gate_error.cx.reduce((a, b) => a + b, 0) / device.gate_error.cx.length * 100).toFixed(3)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDevice && (
            <div className="selected-device-info">
              <h4>Selected Device: {selectedDevice.name}</h4>
              <div className="device-actions">
                <button 
                  className="run-on-hardware-btn"
                  onClick={() => {
                    // This would trigger running the circuit on the selected device
                    console.log('Running on', selectedDevice.name);
                  }}
                >
                  🎯 Run Circuit on Hardware
                </button>
                <button className="device-info-btn">
                  📊 View Device Topology
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IBMQuantumIntegration;
