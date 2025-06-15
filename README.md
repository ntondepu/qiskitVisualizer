# Quantum Circuit Visualizer

An interactive web application for learning quantum computing through circuit visualization and simulation — powered by Qiskit, React, and Flask.

## Overview

This platform enables users to:
- Upload and simulate QASM files
- Build custom quantum circuits
- Visualize qubit states with Bloch spheres
- Run circuits on IBM Quantum hardware
- Learn through challenge modes

## Features

### Circuit Visualization
- Drag-and-drop QASM file processing
- Interactive circuit diagram rendering
- Dynamic Bloch sphere representation
- Gate sequence analysis

### Circuit Construction
- Intuitive UI for adding gates (H, X, Y, Z, CX, SWAP)
- Real-time visualization
- Measurement toggles

### Quantum Simulation
- Statevector simulation
- Noise model configuration:
  - Bit-flip
  - Depolarizing
  - Measurement error
- IBM Quantum backend integration

## Installation

### Prerequisites
- Node.js 16+
- Python 3.8+
- IBM Quantum API token (optional)

1. Clone the repository:
   git clone https://github.com/yourusername/quantum-learning-platform.git
   cd quantum-learning-platform

2. Set up frontend:
   cd client
  npm install

3. Set up backend:
   cd ../server
   pip install -r requirements.txt

4. Run the app:
   cd server
   python server.py
   cd ../client
   npm run dev

5. Access at http://localhost:5173

### Technologies Used
Frontend:
- React 18
- Three.js + React-Three-Fiber
- Vite
- Plotly.js

Backend:
- Python Flask
- Qiskit
- NumPy

### Future Enhancements
- Animated gate transitions
- Quantum concept tutorials
- Circuit optimization tools
- Export functionality (PNG/PDF)
- Better, more appealing UI
