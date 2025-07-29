import React, { useState } from 'react';
import BlochSphere3D from './BlochSphere3D';
import IBMQuantumIntegration from './IBMQuantumIntegration';
import CircuitAnimator from './CircuitAnimator';
import AdvancedNoiseModeling from './AdvancedNoiseModeling';

const AdvancedFeatures = () => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [noiseModel, setNoiseModel] = useState(null);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [activeFeature, setActiveFeature] = useState('3d-visualization');

  const features = [
    {
      id: '3d-visualization',
      name: '3D Visualization',
      icon: '🎯',
      description: 'Interactive 3D Bloch spheres with real-time state visualization',
      gradient: 'from-blue-500 to-purple-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-purple-50'
    },
    {
      id: 'ibm-integration',
      name: 'Quantum Hardware',
      icon: '🚀',
      description: 'Connect to real quantum computers and advanced simulators',
      gradient: 'from-green-500 to-teal-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-teal-50'
    },
    {
      id: 'circuit-animation',
      name: 'Circuit Animation',
      icon: '🎬',
      description: 'Watch quantum circuits execute step-by-step with state evolution',
      gradient: 'from-orange-500 to-red-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-red-50'
    },
    {
      id: 'advanced-noise',
      name: 'Noise Modeling',
      icon: '🔬',
      description: 'Realistic quantum device noise simulation and error modeling',
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50'
    }
  ];

  const mockQubitStates = [
    { alpha: 1, beta: 0 }, // |0⟩
    { alpha: 0.707, beta: 0.707 }, // |+⟩ 
    { alpha: 0.6, beta: 0.8 } // Custom superposition
  ];

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
    console.log('Selected device:', device);
  };

  const handleNoiseChange = (noise) => {
    setNoiseModel(noise);
    console.log('Noise model updated:', noise);
  };

  const handleAnimationComplete = () => {
    setIsAnimationPlaying(false);
    console.log('Animation completed');
  };

  return (
    <div className="advanced-features-modern">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">Advanced Quantum Features</span>
          </h1>
          <p className="hero-subtitle">
            Experience cutting-edge quantum computing visualization and simulation
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">4</span>
              <span className="stat-label">Advanced Tools</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">3D</span>
              <span className="stat-label">Visualization</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">∞</span>
              <span className="stat-label">Possibilities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Navigation */}
      <div className="feature-nav">
        <div className="nav-container">
          {features.map(feature => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              className={`feature-nav-card ${activeFeature === feature.id ? 'active' : ''}`}
            >
              <div className="nav-card-content">
                <div className="nav-icon">{feature.icon}</div>
                <div className="nav-text">
                  <h3 className="nav-title">{feature.name}</h3>
                  <p className="nav-description">{feature.description}</p>
                </div>
              </div>
              <div className={`nav-indicator bg-gradient-to-r ${feature.gradient}`}></div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Content */}
      <div className="feature-content">
        {activeFeature === '3d-visualization' && (
          <div className="feature-panel visualization-panel">
            <div className="panel-header">
              <h2>🎯 3D Quantum State Visualization</h2>
              <p>Interactive 3D Bloch spheres with realistic quantum state representation</p>
            </div>
            
            <div className="bloch-grid">
              {mockQubitStates.map((state, index) => (
                <div key={index} className="bloch-card">
                  <div className="bloch-header">
                    <h4>Qubit {index}</h4>
                    <div className="state-badge">
                      {index === 0 ? '|0⟩' : index === 1 ? '|+⟩' : 'Custom'}
                    </div>
                  </div>
                  <BlochSphere3D
                    qubitState={state}
                    qubitIndex={index}
                    isInteractive={true}
                  />
                  <div className="state-info">
                    <div className="coefficient">
                      <span>α = {state.alpha.toFixed(3)}</span>
                      <span>β = {state.beta.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="features-showcase">
              <h3>✨ Interactive Features</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon">🖱️</div>
                  <h4>Drag & Rotate</h4>
                  <p>Intuitive mouse controls for 3D navigation</p>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <h4>Real-time Updates</h4>
                  <p>Watch states evolve as gates are applied</p>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📐</div>
                  <h4>Accurate Physics</h4>
                  <p>Proper Bloch sphere geometry and mathematics</p>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🎨</div>
                  <h4>Beautiful Rendering</h4>
                  <p>Smooth animations and realistic lighting</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeFeature === 'ibm-integration' && (
          <div className="feature-panel">
            <div className="panel-header">
              <h3>🚀 IBM Quantum Hardware Integration</h3>
              <p>Connect to real quantum computers for authentic quantum computing experience</p>
            </div>
            
            <IBMQuantumIntegration
              onDeviceSelect={handleDeviceSelect}
              selectedDevice={selectedDevice}
            />

            {selectedDevice && (
              <div className="hardware-info">
                <h4>🔧 Hardware Capabilities</h4>
                <div className="capabilities-grid">
                  <div className="capability-item">
                    <span className="capability-icon">⚛️</span>
                    <div>
                      <strong>Quantum Volume:</strong> Real quantum hardware performance metrics
                    </div>
                  </div>
                  <div className="capability-item">
                    <span className="capability-icon">🔗</span>
                    <div>
                      <strong>Connectivity:</strong> Device-specific qubit coupling topology
                    </div>
                  </div>
                  <div className="capability-item">
                    <span className="capability-icon">📈</span>
                    <div>
                      <strong>Live Status:</strong> Real-time queue and calibration data
                    </div>
                  </div>
                  <div className="capability-item">
                    <span className="capability-icon">🎯</span>
                    <div>
                      <strong>Error Rates:</strong> Actual device error characteristics
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeFeature === 'circuit-animation' && (
          <div className="feature-panel">
            <div className="panel-header">
              <h3>🎬 Circuit Animation & State Evolution</h3>
              <p>Watch quantum circuits execute step-by-step with live state visualization</p>
            </div>
            
            <CircuitAnimator
              circuit={null} // Will be populated with actual circuit data
              isPlaying={isAnimationPlaying}
              onAnimationComplete={handleAnimationComplete}
            />

            <div className="animation-controls-extended">
              <button
                onClick={() => setIsAnimationPlaying(!isAnimationPlaying)}
                className={`animation-toggle ${isAnimationPlaying ? 'playing' : ''}`}
              >
                {isAnimationPlaying ? '⏸️ Pause Animation' : '▶️ Start Animation'}
              </button>
            </div>

            <div className="animation-features">
              <h4>🎭 Animation Features</h4>
              <div className="features-list">
                <div className="feature-item">
                  <span>⏯️</span>
                  <div>
                    <strong>Playback Controls:</strong> Play, pause, step forward/backward
                  </div>
                </div>
                <div className="feature-item">
                  <span>⚡</span>
                  <div>
                    <strong>Variable Speed:</strong> Adjust animation speed for learning
                  </div>
                </div>
                <div className="feature-item">
                  <span>📊</span>
                  <div>
                    <strong>State Evolution:</strong> Watch quantum states change in real-time
                  </div>
                </div>
                <div className="feature-item">
                  <span>🎯</span>
                  <div>
                    <strong>Gate Highlighting:</strong> Visual focus on current operation
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeFeature === 'advanced-noise' && (
          <div className="feature-panel">
            <div className="panel-header">
              <h3>🔬 Advanced Noise Modeling</h3>
              <p>Realistic quantum device simulation with comprehensive error modeling</p>
            </div>
            
            <AdvancedNoiseModeling
              onNoiseChange={handleNoiseChange}
              circuit={null}
            />

            <div className="noise-features">
              <h4>🧪 Noise Model Features</h4>
              <div className="noise-feature-grid">
                <div className="noise-feature">
                  <h5>🕐 Decoherence</h5>
                  <p>T₁ relaxation and T₂ dephasing with realistic timescales</p>
                </div>
                <div className="noise-feature">
                  <h5>🎯 Gate Errors</h5>
                  <p>Single and two-qubit gate error rates based on real devices</p>
                </div>
                <div className="noise-feature">
                  <h5>📖 Readout Errors</h5>
                  <p>Measurement errors and state preparation imperfections</p>
                </div>
                <div className="noise-feature">
                  <h5>🔗 Cross-talk</h5>
                  <p>Inter-qubit interference and unwanted coupling effects</p>
                </div>
                <div className="noise-feature">
                  <h5>🌡️ Thermal Effects</h5>
                  <p>Temperature-dependent relaxation and thermal populations</p>
                </div>
                <div className="noise-feature">
                  <h5>📊 Fidelity Prediction</h5>
                  <p>Estimated circuit performance under realistic conditions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="features-summary">
        <div className="summary-card">
          <h4>🚀 Phase 1 Complete!</h4>
          <p>
            You now have access to industry-leading quantum visualization features:
          </p>
          <ul>
            <li>✅ Interactive 3D Bloch spheres with WebGL rendering</li>
            <li>✅ IBM Quantum hardware integration capabilities</li>
            <li>✅ Step-by-step circuit animation system</li>
            <li>✅ Advanced noise modeling for realistic simulation</li>
          </ul>
          <div className="next-phase-preview">
            <strong>Coming in Phase 2:</strong> Quantum gaming, AI optimization, real-time collaboration
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFeatures;
