import React, { useState, useEffect } from 'react';

const AdvancedNoiseModeling = ({ onNoiseChange, circuit }) => {
  const [noiseModel, setNoiseModel] = useState({
    // Coherence errors
    t1_times: [50, 75, 60, 80, 65], // T1 relaxation times in μs
    t2_times: [25, 35, 30, 40, 32], // T2 dephasing times in μs
    
    // Gate errors
    single_gate_errors: {
      'h': 0.001,
      'x': 0.0008,
      'y': 0.0009,
      'z': 0.0005,
      's': 0.0006,
      't': 0.0007,
      'rz': 0.001
    },
    two_gate_errors: {
      'cx': 0.01,
      'cz': 0.012,
      'swap': 0.015
    },
    
    // Readout errors
    readout_errors: [0.02, 0.018, 0.025, 0.015, 0.022],
    
    // Thermal relaxation
    thermal_population: [0.05, 0.03, 0.04, 0.02, 0.06],
    
    // Cross-talk
    crosstalk_enabled: false,
    crosstalk_strength: 0.001,
    
    // Device-specific parameters
    device_type: 'custom',
    topology: 'linear'
  });

  const [presetDevices, setPresetDevices] = useState([
    {
      id: 'ibm_cairo',
      name: 'IBM Cairo (27 qubits)',
      t1_range: [40, 120],
      t2_range: [20, 80],
      readout_error_range: [0.01, 0.03],
      gate_error_multiplier: 1.0
    },
    {
      id: 'google_sycamore',
      name: 'Google Sycamore',
      t1_range: [15, 25],
      t2_range: [8, 15],
      readout_error_range: [0.005, 0.015],
      gate_error_multiplier: 0.8
    },
    {
      id: 'rigetti_aspen',
      name: 'Rigetti Aspen',
      t1_range: [20, 40],
      t2_range: [10, 25],
      readout_error_range: [0.02, 0.05],
      gate_error_multiplier: 1.2
    },
    {
      id: 'ideal',
      name: 'Ideal (No Noise)',
      t1_range: [1000000, 1000000],
      t2_range: [1000000, 1000000],
      readout_error_range: [0, 0],
      gate_error_multiplier: 0
    }
  ]);

  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    onNoiseChange?.(noiseModel);
  }, [noiseModel, onNoiseChange]);

  const applyPreset = (presetId) => {
    const preset = presetDevices.find(d => d.id === presetId);
    if (!preset) return;

    const numQubits = 5; // Default number of qubits
    
    setNoiseModel(prev => ({
      ...prev,
      t1_times: Array.from({ length: numQubits }, () => 
        preset.t1_range[0] + Math.random() * (preset.t1_range[1] - preset.t1_range[0])
      ),
      t2_times: Array.from({ length: numQubits }, () => 
        preset.t2_range[0] + Math.random() * (preset.t2_range[1] - preset.t2_range[0])
      ),
      readout_errors: Array.from({ length: numQubits }, () => 
        preset.readout_error_range[0] + Math.random() * (preset.readout_error_range[1] - preset.readout_error_range[0])
      ),
      single_gate_errors: Object.fromEntries(
        Object.entries(prev.single_gate_errors).map(([gate, error]) => [
          gate, error * preset.gate_error_multiplier
        ])
      ),
      two_gate_errors: Object.fromEntries(
        Object.entries(prev.two_gate_errors).map(([gate, error]) => [
          gate, error * preset.gate_error_multiplier
        ])
      ),
      device_type: presetId
    }));
    
    setSelectedPreset(presetId);
  };

  const updateCoherenceTime = (qubitIndex, timeType, value) => {
    setNoiseModel(prev => ({
      ...prev,
      [`${timeType}_times`]: prev[`${timeType}_times`].map((time, idx) => 
        idx === qubitIndex ? parseFloat(value) : time
      )
    }));
  };

  const updateGateError = (gateType, errorType, value) => {
    setNoiseModel(prev => ({
      ...prev,
      [`${errorType}_gate_errors`]: {
        ...prev[`${errorType}_gate_errors`],
        [gateType]: parseFloat(value)
      }
    }));
  };

  const generateNoiseReport = () => {
    const avgT1 = noiseModel.t1_times.reduce((a, b) => a + b, 0) / noiseModel.t1_times.length;
    const avgT2 = noiseModel.t2_times.reduce((a, b) => a + b, 0) / noiseModel.t2_times.length;
    const avgReadoutError = noiseModel.readout_errors.reduce((a, b) => a + b, 0) / noiseModel.readout_errors.length;
    
    return {
      avgT1: avgT1.toFixed(1),
      avgT2: avgT2.toFixed(1),
      avgReadoutError: (avgReadoutError * 100).toFixed(2),
      coherenceRatio: (avgT2 / avgT1).toFixed(3),
      estimatedFidelity: (1 - Math.max(...Object.values(noiseModel.single_gate_errors))).toFixed(4)
    };
  };

  const report = generateNoiseReport();

  return (
    <div className="advanced-noise-modeling">
      <div className="noise-header">
        <h3>🔬 Advanced Noise Modeling</h3>
        <p>Configure realistic quantum device noise parameters</p>
      </div>

      <div className="noise-presets">
        <h4>Device Presets</h4>
        <div className="preset-buttons">
          {presetDevices.map(device => (
            <button
              key={device.id}
              onClick={() => applyPreset(device.id)}
              className={`preset-btn ${selectedPreset === device.id ? 'active' : ''}`}
            >
              {device.name}
            </button>
          ))}
        </div>
      </div>

      <div className="noise-summary">
        <h4>Noise Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Avg T₁:</span>
            <span className="summary-value">{report.avgT1} μs</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Avg T₂:</span>
            <span className="summary-value">{report.avgT2} μs</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Readout Error:</span>
            <span className="summary-value">{report.avgReadoutError}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">T₂/T₁ Ratio:</span>
            <span className="summary-value">{report.coherenceRatio}</span>
          </div>
        </div>
      </div>

      <div className="coherence-section">
        <h4>Coherence Times</h4>
        <div className="coherence-grid">
          {noiseModel.t1_times.map((t1, idx) => (
            <div key={idx} className="qubit-coherence">
              <h5>Qubit {idx}</h5>
              <div className="coherence-controls">
                <div className="coherence-input">
                  <label>T₁ (μs):</label>
                  <input
                    type="number"
                    value={t1.toFixed(1)}
                    onChange={(e) => updateCoherenceTime(idx, 't1', e.target.value)}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="coherence-input">
                  <label>T₂ (μs):</label>
                  <input
                    type="number"
                    value={noiseModel.t2_times[idx].toFixed(1)}
                    onChange={(e) => updateCoherenceTime(idx, 't2', e.target.value)}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="coherence-input">
                  <label>Readout Error:</label>
                  <input
                    type="number"
                    value={noiseModel.readout_errors[idx].toFixed(3)}
                    onChange={(e) => setNoiseModel(prev => ({
                      ...prev,
                      readout_errors: prev.readout_errors.map((err, i) => 
                        i === idx ? parseFloat(e.target.value) : err
                      )
                    }))}
                    min="0"
                    max="1"
                    step="0.001"
                  />
                </div>
              </div>
              <div className="coherence-visual">
                <div className="coherence-bar">
                  <div 
                    className="t1-bar"
                    style={{ width: `${Math.min(t1 / 100 * 100, 100)}%` }}
                    title={`T₁: ${t1.toFixed(1)} μs`}
                  />
                  <div 
                    className="t2-bar"
                    style={{ width: `${Math.min(noiseModel.t2_times[idx] / 100 * 100, 100)}%` }}
                    title={`T₂: ${noiseModel.t2_times[idx].toFixed(1)} μs`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="gate-errors-section">
        <h4>Gate Error Rates</h4>
        <div className="gate-errors-grid">
          <div className="single-gate-errors">
            <h5>Single-Qubit Gates</h5>
            {Object.entries(noiseModel.single_gate_errors).map(([gate, error]) => (
              <div key={gate} className="gate-error-control">
                <label>{gate.toUpperCase()}:</label>
                <input
                  type="number"
                  value={error.toFixed(4)}
                  onChange={(e) => updateGateError(gate, 'single', e.target.value)}
                  min="0"
                  max="1"
                  step="0.0001"
                />
                <span className="error-percentage">{(error * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
          
          <div className="two-gate-errors">
            <h5>Two-Qubit Gates</h5>
            {Object.entries(noiseModel.two_gate_errors).map(([gate, error]) => (
              <div key={gate} className="gate-error-control">
                <label>{gate.toUpperCase()}:</label>
                <input
                  type="number"
                  value={error.toFixed(4)}
                  onChange={(e) => updateGateError(gate, 'two', e.target.value)}
                  min="0"
                  max="1"
                  step="0.0001"
                />
                <span className="error-percentage">{(error * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="advanced-options">
        <button 
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▲' : '▼'} Advanced Options
        </button>
        
        {showAdvanced && (
          <div className="advanced-controls">
            <div className="crosstalk-section">
              <h5>Cross-talk</h5>
              <div className="crosstalk-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={noiseModel.crosstalk_enabled}
                    onChange={(e) => setNoiseModel(prev => ({
                      ...prev,
                      crosstalk_enabled: e.target.checked
                    }))}
                  />
                  Enable Cross-talk
                </label>
                {noiseModel.crosstalk_enabled && (
                  <div className="crosstalk-strength">
                    <label>Strength:</label>
                    <input
                      type="number"
                      value={noiseModel.crosstalk_strength}
                      onChange={(e) => setNoiseModel(prev => ({
                        ...prev,
                        crosstalk_strength: parseFloat(e.target.value)
                      }))}
                      min="0"
                      max="0.1"
                      step="0.0001"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="thermal-section">
              <h5>Thermal Effects</h5>
              <div className="thermal-controls">
                {noiseModel.thermal_population.map((temp, idx) => (
                  <div key={idx} className="thermal-control">
                    <label>Qubit {idx} Thermal Population:</label>
                    <input
                      type="number"
                      value={temp.toFixed(3)}
                      onChange={(e) => setNoiseModel(prev => ({
                        ...prev,
                        thermal_population: prev.thermal_population.map((t, i) => 
                          i === idx ? parseFloat(e.target.value) : t
                        )
                      }))}
                      min="0"
                      max="1"
                      step="0.001"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="noise-visualization">
        <h4>Noise Impact Visualization</h4>
        <div className="noise-chart">
          <div className="fidelity-prediction">
            <div className="fidelity-meter">
              <div className="meter-label">Estimated Circuit Fidelity</div>
              <div className="meter-value">{report.estimatedFidelity}</div>
              <div 
                className="meter-bar"
                style={{ 
                  width: `${parseFloat(report.estimatedFidelity) * 100}%`,
                  backgroundColor: parseFloat(report.estimatedFidelity) > 0.95 ? '#4caf50' : 
                                   parseFloat(report.estimatedFidelity) > 0.8 ? '#ff9800' : '#f44336'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedNoiseModeling;
