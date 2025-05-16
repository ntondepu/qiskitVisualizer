import streamlit as st
from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_bloch_multivector
import matplotlib.pyplot as plt

st.title("🧠 Qiskit Circuit Visualizer")

uploaded_file = st.file_uploader("Upload your QASM file (.qasm)", type=["qasm"])

if uploaded_file is not None:
    try:
        qasm_str = uploaded_file.read().decode("utf-8")
        qc = QuantumCircuit.from_qasm_str(qasm_str)

        st.subheader("Circuit Diagram")
        fig = qc.draw(output="mpl")
        st.pyplot(fig)

        st.write(f"Number of qubits: {qc.num_qubits}")
        st.write(f"Number of gates: {qc.size()}")

        # Run simulation and show measurement results
        backend = Aer.get_backend('qasm_simulator')
        job = execute(qc, backend, shots=1024)
        result = job.result()
        counts = result.get_counts()
        st.subheader("Measurement Results")
        st.bar_chart(counts)

        # Show Bloch sphere if no measurements in circuit
        if not any(inst.operation.name == 'measure' for inst in qc.data):
            sim_backend = Aer.get_backend('statevector_simulator')
            sim_result = execute(qc, sim_backend).result()
            state_vector = sim_result.get_statevector()
            st.subheader("Bloch Sphere (Final State)")
            bloch_fig = plot_bloch_multivector(state_vector)
            st.pyplot(bloch_fig)
        else:
            st.info("Bloch sphere visualization skipped (circuit contains measurements)")

    except Exception as e:
        st.error(f"Error: {e}")

