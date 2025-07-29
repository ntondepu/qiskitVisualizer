import React, { useState, useEffect, useRef } from 'react';

const CircuitAnimator = ({ circuit, isPlaying, onAnimationComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms per step
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Mock circuit data - in real implementation this would come from the circuit prop
  const mockGates = [
    { type: 'H', qubit: 0, step: 0, symbol: 'H' },
    { type: 'CX', control: 0, target: 1, step: 1, symbol: '⊕' },
    { type: 'RZ', qubit: 1, step: 2, symbol: 'RZ(π/4)', angle: Math.PI/4 },
    { type: 'H', qubit: 1, step: 3, symbol: 'H' },
    { type: 'MEASURE', qubit: 0, step: 4, symbol: 'M' },
    { type: 'MEASURE', qubit: 1, step: 5, symbol: 'M' }
  ];

  const numQubits = 2;
  const totalSteps = mockGates.length;

  useEffect(() => {
    if (isPlaying && !isAnimating) {
      startAnimation();
    } else if (!isPlaying && isAnimating) {
      stopAnimation();
    }
  }, [isPlaying]);

  const startAnimation = () => {
    setIsAnimating(true);
    setCurrentStep(0);
    animateStep();
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
  };

  const animateStep = () => {
    if (currentStep >= totalSteps) {
      setIsAnimating(false);
      onAnimationComplete?.();
      return;
    }

    animationRef.current = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      animateStep();
    }, animationSpeed);
  };

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Setup drawing parameters
    const qubitLineY = (qubit) => 80 + qubit * 100;
    const stepX = (step) => 100 + step * 120;
    const gateWidth = 80;
    const gateHeight = 60;

    // Draw qubit lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let q = 0; q < numQubits; q++) {
      const y = qubitLineY(q);
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 50, y);
      ctx.stroke();

      // Draw qubit labels
      ctx.fillStyle = '#333';
      ctx.font = '16px Arial';
      ctx.fillText(`|q${q}⟩`, 10, y + 5);
    }

    // Draw gates up to current step
    mockGates.slice(0, currentStep + 1).forEach((gate, index) => {
      const isCurrentGate = index === currentStep;
      const x = stepX(gate.step);

      if (gate.type === 'CX') {
        // Draw CNOT gate
        const controlY = qubitLineY(gate.control);
        const targetY = qubitLineY(gate.target);

        // Control dot
        ctx.fillStyle = isCurrentGate ? '#ff6b6b' : '#333';
        ctx.beginPath();
        ctx.arc(x, controlY, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Control line
        ctx.strokeStyle = isCurrentGate ? '#ff6b6b' : '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, controlY);
        ctx.lineTo(x, targetY);
        ctx.stroke();

        // Target circle
        ctx.strokeStyle = isCurrentGate ? '#ff6b6b' : '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, targetY, 20, 0, 2 * Math.PI);
        ctx.stroke();

        // Target plus
        ctx.beginPath();
        ctx.moveTo(x - 12, targetY);
        ctx.lineTo(x + 12, targetY);
        ctx.moveTo(x, targetY - 12);
        ctx.lineTo(x, targetY + 12);
        ctx.stroke();

      } else {
        // Draw single qubit gate
        const y = qubitLineY(gate.qubit);
        
        // Gate box
        ctx.fillStyle = isCurrentGate ? '#ff6b6b' : '#e3f2fd';
        ctx.strokeStyle = isCurrentGate ? '#d32f2f' : '#1976d2';
        ctx.lineWidth = 2;
        ctx.fillRect(x - gateWidth/2, y - gateHeight/2, gateWidth, gateHeight);
        ctx.strokeRect(x - gateWidth/2, y - gateHeight/2, gateWidth, gateHeight);

        // Gate symbol
        ctx.fillStyle = isCurrentGate ? 'white' : '#1976d2';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gate.symbol, x, y + 5);
      }

      // Add glow effect for current gate
      if (isCurrentGate) {
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowBlur = 0;
      }
    });

    // Draw step indicator
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Step: ${currentStep}/${totalSteps}`, 20, height - 20);

    // Draw current gate info
    if (currentStep < totalSteps) {
      const currentGate = mockGates[currentStep];
      let gateInfo = `Current: ${currentGate.type}`;
      if (currentGate.type === 'CX') {
        gateInfo += ` (Control: q${currentGate.control}, Target: q${currentGate.target})`;
      } else {
        gateInfo += ` on q${currentGate.qubit}`;
      }
      ctx.fillText(gateInfo, 20, height - 40);
    }
  };

  useEffect(() => {
    drawCircuit();
  }, [currentStep]);

  const handleSpeedChange = (newSpeed) => {
    setAnimationSpeed(2000 - newSpeed); // Invert so higher value = faster
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentStep(0);
  };

  const stepForward = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="circuit-animator">
      <div className="animator-header">
        <h3>🎬 Circuit Animation</h3>
        <p>Watch your quantum circuit execute step by step</p>
      </div>

      <div className="animation-canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="circuit-canvas"
        />
      </div>

      <div className="animation-controls">
        <div className="playback-controls">
          <button 
            onClick={resetAnimation}
            className="control-btn reset-btn"
            title="Reset to beginning"
          >
            ⏮️
          </button>
          
          <button 
            onClick={stepBackward}
            disabled={currentStep === 0}
            className="control-btn step-btn"
            title="Step backward"
          >
            ⏪
          </button>
          
          <button 
            onClick={isAnimating ? stopAnimation : startAnimation}
            className={`control-btn play-btn ${isAnimating ? 'playing' : ''}`}
            title={isAnimating ? "Pause" : "Play"}
          >
            {isAnimating ? '⏸️' : '▶️'}
          </button>
          
          <button 
            onClick={stepForward}
            disabled={currentStep >= totalSteps}
            className="control-btn step-btn"
            title="Step forward"
          >
            ⏩
          </button>
        </div>

        <div className="speed-control">
          <label htmlFor="speed-slider">Animation Speed:</label>
          <input
            id="speed-slider"
            type="range"
            min="100"
            max="1900"
            value={2000 - animationSpeed}
            onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
            className="speed-slider"
          />
          <span className="speed-label">
            {animationSpeed <= 500 ? 'Fast' : animationSpeed <= 1000 ? 'Medium' : 'Slow'}
          </span>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="gate-sequence">
        <h4>Gate Sequence</h4>
        <div className="gates-timeline">
          {mockGates.map((gate, index) => (
            <div 
              key={index}
              className={`timeline-gate ${index === currentStep ? 'current' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(index)}
            >
              <div className="gate-step">{index + 1}</div>
              <div className="gate-info">
                <div className="gate-type">{gate.type}</div>
                {gate.type === 'CX' ? (
                  <div className="gate-qubits">q{gate.control} → q{gate.target}</div>
                ) : (
                  <div className="gate-qubits">q{gate.qubit}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="quantum-state-evolution">
        <h4>Quantum State Evolution</h4>
        <div className="state-display">
          <div className="state-step">
            <strong>Step {currentStep}:</strong>
            <span className="state-vector">
              {currentStep === 0 && "|00⟩"}
              {currentStep === 1 && "1/√2(|00⟩ + |10⟩)"}
              {currentStep === 2 && "1/√2(|00⟩ + |11⟩)"}
              {currentStep === 3 && "1/√2(|00⟩ + e^(iπ/4)|11⟩)"}
              {currentStep >= 4 && "Measured state"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitAnimator;
