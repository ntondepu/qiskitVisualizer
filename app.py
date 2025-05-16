import streamlit as st
from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_bloch_multivector
import matplotlib.pyplot as plt
from qiskit.quantum_info import Statevector, partial_trace
from qiskit.visualization import plot_bloch_vector

st.set_page_config(page_title="Qiskit Visualizer", layout="centered")
st.title("🧠 Qiskit Circuit Visualizer")

# Tabs for QASM upload and Circuit Builder
tab1, tab2 = st.tabs(["📤 Upload QASM File", "🧱 Build Circuit"])

# ========== TAB 1: UPLOAD QASM ==========
with tab1:
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

            backend = Aer.get_backend('qasm_simulator')
            job = execute(qc, backend, shots=1024)
            result = job.result()
            counts = result.get_counts()
            st.subheader("Measurement Results")
            st.bar_chart(counts)

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

# ========== TAB 2: BUILD CIRCUIT ==========
with tab2:
    st.sidebar.header("🎛️ Circuit Builder")

    num_qubits = st.sidebar.number_input("Number of Qubits", min_value=1, max_value=5, value=2)

    st.sidebar.subheader("Apply Gates")
    apply_h = st.sidebar.checkbox("H gate on q[0]")
    apply_x = st.sidebar.checkbox("X gate on q[1]")
    apply_y = st.sidebar.checkbox("Y gate on q[0]")
    apply_z = st.sidebar.checkbox("Z gate on q[1]")
    apply_cx = st.sidebar.checkbox("CX (q[0] → q[1])")
    apply_swap = st.sidebar.checkbox("SWAP (q[0] ↔ q[1])")
    measure = st.sidebar.checkbox("Add Measurement")

    qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)

    if apply_h:
        qc.h(0)
    if apply_x and num_qubits > 1:
        qc.x(1)
    if apply_y:
        qc.y(0)
    if apply_z and num_qubits > 1:
        qc.z(1)
    if apply_cx and num_qubits > 1:
        qc.cx(0, 1)
    if apply_swap and num_qubits > 1:
        qc.swap(0, 1)
    if measure:
        for i in range(num_qubits):
            qc.measure(i, i)

    st.subheader("🧩 Generated Circuit")
    st.pyplot(qc.draw(output="mpl"))

    if not measure:
        st.subheader("🌀 Bloch Sphere (Final State)")
        backend = Aer.get_backend('statevector_simulator')
        result = execute(qc, backend).result()
        statevector = result.get_statevector()
        if num_qubits == 1:
            st.pyplot(plot_bloch_multivector(statevector))
        else:
            st.subheader("Bloch Spheres (Individual Qubits)")
            sv = Statevector(statevector)
            for i in range(num_qubits):
                reduced = partial_trace(sv, [j for j in range(num_qubits) if j != i])
                bloch = plot_bloch_vector(reduced.data[:3], title=f"Qubit {i}")
                st.pyplot(bloch)
    else:
        st.subheader("📊 Measurement Results")
        backend = Aer.get_backend('qasm_simulator')
        result = execute(qc, backend, shots=1024).result()
        counts = result.get_counts()
        st.bar_chart(counts)

    st.subheader("📥 Download QASM File")
    qasm_str = qc.qasm()
    st.download_button(
        label="Download circuit as QASM",
        data=qasm_str,
        file_name="custom_circuit.qasm",
        mime="text/plain"
    )
