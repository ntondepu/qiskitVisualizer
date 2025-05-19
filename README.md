# Quantum Learning Platform

An interactive web-based tool for learning, visualizing, and experimenting with quantum circuits — powered by Qiskit and Streamlit.

## Overview

This platform allows users to:
- Upload QASM files and simulate quantum circuits
- Build custom circuits with an interactive UI
- Optimize and simulate circuits under real-world quantum noise
- Visualize qubit states using Bloch spheres
- Test understanding via challenge modes
- Run circuits on real IBM Quantum devices

Ideal for quantum computing learners, educators, and enthusiasts.

## Features

### Upload QASM
- Drag-and-drop `.qasm` files
- View circuit diagrams and measurement results
- Bloch sphere visualization (if no measurement)

### Build Your Own Circuit
- Add up to 15 gates using a simple interface
- Supports H, X, Y, Z, CX, SWAP gates
- Step-by-step gate explanations
- Optional measurement toggle
- Real-time circuit visualization and Bloch sphere rendering

### Optimize Circuits
- Use Qiskit's `transpile()` with `optimization_level=3`
- Compare pre- and post-optimization gate counts

### Simulate Noise
- Add configurable noise models:
  - Bit-flip
  - Depolarizing
  - Measurement error
- View realistic output histograms

### Challenge Mode
- Solve quantum logic puzzles like:
  - Create a Bell state
  - Flip a qubit using one gate
- Automatic feedback system

### Run on IBM Quantum
- Authenticate using your IBM Quantum API token
- Execute circuits on real or simulated IBM hardware
- View backend results as histograms

## Installation

1. Clone the repository:
   git clone https://github.com/yourusername/quantum-learning-platform.git
   cd quantum-learning-platform

2. Create a virtual environment:
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate

3. Create a virtual environment:
  pip install -r requirements.txt

4. Run the app:
  streamlit run app.py

### IBM Quantum Setup
- Sign in at https://quantum-computing.ibm.com/
- Navigate to Account and copy your API Token
- Paste the token into the app under the "Run on IBM Quantum" tab

### Technologies Used
- Streamlit – for the user interface
- Qiskit – for quantum simulation and circuit execution
- IBM Quantum Provider – for cloud-based backend access
- Matplotlib – for visualizing circuits and Bloch spheres
- NumPy – for numerical computations

### Future Enhancements
- Animated gate-by-gate Bloch sphere transitions
- Informational tab for key quantum concepts (superposition, entanglement, etc.)
- User progress tracking and account system
- Export circuits to PNG/PDF
