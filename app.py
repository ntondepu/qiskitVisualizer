import streamlit as st
from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_bloch_vector, plot_bloch_multivector
from qiskit.quantum_info import Statevector, Pauli, partial_trace
import numpy as np
import matplotlib.pyplot as plt
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# ============ CONFIG =============
st.set_page_config(page_title="Quantum Learning Platform", layout="wide")
st.title("🧠 Quantum Learning Platform with Local Chatbot")

# ============ Load Local AI Model ============
@st.cache_resource(show_spinner=False)
def load_model():
    tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
    model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-small")
    return tokenizer, model

tokenizer, model = load_model()

def local_chatbot_response(chat_history_ids, new_input):
    new_input_ids = tokenizer.encode(new_input + tokenizer.eos_token, return_tensors='pt')
    bot_input_ids = torch.cat([chat_history_ids, new_input_ids], dim=-1) if chat_history_ids is not None else new_input_ids
    chat_history_ids = model.generate(bot_input_ids, max_length=1000, pad_token_id=tokenizer.eos_token_id)
    response = tokenizer.decode(chat_history_ids[:, bot_input_ids.shape[-1]:][0], skip_special_tokens=True)
    return response, chat_history_ids

# ============ Q&A Knowledge Base ============
qa_pairs = {
    "what is quantum computing": "Quantum computing uses quantum bits or qubits that can be in superpositions, enabling powerful parallel computations.",
    "what is a qubit": "A qubit is the quantum version of a classical bit. Unlike a bit, it can exist in a superposition of 0 and 1.",
    "what is a hadamard gate": "The Hadamard gate creates a superposition state. It transforms |0⟩ into (|0⟩ + |1⟩)/√2 and |1⟩ into (|0⟩ - |1⟩)/√2.",
    "what is a measurement": "Measurement collapses a qubit's state into a definite classical value: either 0 or 1. It ends the quantum behavior."
}

# ============ TABS =============
tab_upload, tab_build, tab_info, tab_chat = st.tabs(
    ["📤 Upload QASM File", "🧱 Build Circuit", "📚 Quantum Info", "🤖 Ask Local Chatbot"]
)

# ========== TAB 1: Upload QASM ==========
with tab_upload:
    uploaded_file = st.file_uploader("Upload your QASM file (.qasm)", type=["qasm"])
    if uploaded_file is not None:
        try:
            qasm_str = uploaded_file.read().decode("utf-8")
            qc = QuantumCircuit.from_qasm_str(qasm_str)
            st.subheader("Circuit Diagram")
            st.pyplot(qc.draw(output="mpl"))
            st.write(f"Number of qubits: {qc.num_qubits}")
            st.write(f"Number of gates: {qc.size()}")

            backend = Aer.get_backend('qasm_simulator')
            result = execute(qc, backend, shots=1024).result()
            counts = result.get_counts()
            st.subheader("Measurement Results")
            st.bar_chart(counts)

            if not any(inst.operation.name == 'measure' for inst in qc.data):
                sim_backend = Aer.get_backend('statevector_simulator')
                sim_result = execute(qc, sim_backend).result()
                state_vector = sim_result.get_statevector()
                st.subheader("Bloch Sphere (Final State)")
                st.pyplot(plot_bloch_multivector(state_vector))
            else:
                st.info("Bloch sphere visualization skipped (circuit contains measurements)")

        except Exception as e:
            st.error(f"Error: {e}")

# ========== TAB 2: Build Circuit ==========
with tab_build:
    st.sidebar.header("🎛️ Circuit Builder")
    num_qubits = st.sidebar.number_input("Number of Qubits", min_value=1, max_value=5, value=2)

    st.sidebar.subheader("Add Up to 15 Gates by Position")
    gate_instructions = []
    for i in range(15):
        col = st.sidebar.columns(3)
        gate_type = col[0].selectbox(f"Gate {i+1}", ["", "H", "X", "Y", "Z", "CX", "SWAP"], key=f"gate_{i}")
        target = col[1].number_input(f"q[{i}] target", min_value=0, max_value=num_qubits-1, step=1, key=f"target_{i}")
        control = None
        if gate_type in ["CX", "SWAP"]:
            control = col[2].number_input(f"q[{i}] control", min_value=0, max_value=num_qubits-1, step=1, key=f"control_{i}")
        if gate_type:
            gate_instructions.append((gate_type, target, control))

    measure = st.sidebar.checkbox("Add Measurement")
    qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)

    for gate, target, control in gate_instructions:
        if gate == "H":
            qc.h(target)
        elif gate == "X":
            qc.x(target)
        elif gate == "Y":
            qc.y(target)
        elif gate == "Z":
            qc.z(target)
        elif gate == "CX" and control is not None:
            qc.cx(control, target)
        elif gate == "SWAP" and control is not None:
            qc.swap(control, target)

    if measure:
        for i in range(num_qubits):
            qc.measure(i, i)

    st.subheader("🧩 Generated Circuit")
    st.pyplot(qc.draw(output="mpl"))

    st.write(f"The circuit consists of {len(qc.data)} gate operations.")
    if any(gate[0] == 'H' for gate in gate_instructions):
        st.info("This circuit includes Hadamard gates, so it may involve quantum superposition.")
    if any(gate[0] == 'CX' for gate in gate_instructions):
        st.info("This circuit includes CX gates, suggesting the presence of quantum entanglement.")
    if measure:
        st.info("Measurement gates collapse the quantum state into classical outcomes.")

    if not measure:
        if num_qubits == 1:
            st.subheader("🎬 Gate-by-Gate Bloch Sphere Animation")
            state = Statevector.from_label('0')
            for idx, instruction in enumerate(qc.data):
                state = state.evolve(instruction)
                bloch_vec = [
                    2 * np.real(state.expectation_value(Pauli('X'))),
                    2 * np.real(state.expectation_value(Pauli('Y'))),
                    2 * np.real(state.expectation_value(Pauli('Z')))
                ]
                fig = plot_bloch_vector(bloch_vec, title=f"After gate {idx + 1}: {instruction.operation.name}")
                st.pyplot(fig)
        else:
            st.subheader("🌀 Bloch Sphere (Final State)")
            backend = Aer.get_backend('statevector_simulator')
            result = execute(qc, backend).result()
            statevector = result.get_statevector()
            sv = Statevector(statevector)
            for i in range(num_qubits):
                traced = partial_trace(sv, [j for j in range(num_qubits) if j != i])
                bloch_vector = [2 * np.real(traced.expectation_value(Pauli(p))) for p in ['X', 'Y', 'Z']]
                fig = plot_bloch_vector(bloch_vector, title=f"Qubit {i}")
                st.pyplot(fig)
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

# ========== TAB 3: Quantum Info ==========
with tab_info:
    st.header("Quantum Concepts Explained")
    topic = st.selectbox("Choose a topic", ["Hadamard Gate (H)", "Pauli-X Gate (X)", "Qubit", "Measurement"])

    info = {
        "Hadamard Gate (H)": """
The Hadamard gate (H) is one of the fundamental single-qubit gates in quantum computing. It transforms the basis states |0⟩ and |1⟩ into equal superpositions:
|0⟩ → (|0⟩ + |1⟩) / √2
|1⟩ → (|0⟩ - |1⟩) / √2
This ability to create superposition is key for many quantum algorithms that rely on parallelism.

By applying the H gate, a qubit initially in a definite state can be put into a state where it simultaneously represents multiple possibilities. This gate is also its own inverse, meaning applying it twice returns the qubit to its original state.

Understanding the Hadamard gate is essential for grasping the power of quantum interference and the behavior of quantum algorithms like the Deutsch-Jozsa and Grover's search algorithm.
""",
        "Pauli-X Gate (X)": """
The Pauli-X gate acts as a quantum NOT gate, flipping the state of a qubit:
|0⟩ ↔ |1⟩

This gate is essential for manipulating qubits and is often used in constructing more complex operations. It corresponds to a rotation of the qubit's Bloch vector by π radians about the X-axis.

The Pauli-X gate is also a key building block in quantum error correction and quantum algorithms, enabling the reversal or flipping of qubit states as needed.
""",
        "Qubit": """
A qubit is the fundamental unit of quantum information, analogous to a classical bit but with much richer behavior.

Unlike classical bits that are either 0 or 1, qubits can exist in a superposition of both states simultaneously, described by complex amplitudes. This superposition enables quantum computers to process a vast number of possibilities at once.

Qubits also exhibit entanglement, a quantum phenomenon where the state of one qubit is intrinsically linked to another, regardless of distance. Together, superposition and entanglement provide the foundation for the power of quantum computation.
""",
        "Measurement": """
Measurement in quantum computing is the process of extracting classical information from a qubit.

When a qubit is measured, its superposition collapses probabilistically to either |0⟩ or |1⟩. The outcome depends on the probability amplitudes of the superposition state.

This collapse is irreversible and destroys the quantum state, which is why measurements are typically deferred until the end of a quantum algorithm. Understanding measurement is crucial for interpreting quantum computations and designing algorithms.
"""
    }

    st.markdown(info[topic])

# ========== TAB 4: Local AI Chatbot ==========
with tab_chat:
    st.header("🤖 Ask the Local Quantum Chatbot")

    if "local_chat_history" not in st.session_state:
        st.session_state.local_chat_history = []
        st.session_state.local_chat_ids = None

    user_query = st.text_input("Enter your question about quantum computing:")

    if user_query:
        # Try knowledge base first
        response = qa_pairs.get(user_query.lower())

        # Fallback to DialoGPT if no match found
        if not response:
            response, st.session_state.local_chat_ids = local_chatbot_response(st.session_state.local_chat_ids, user_query)

        st.session_state.local_chat_history.append(("You", user_query))
        st.session_state.local_chat_history.append(("Bot", response))

    for speaker, msg in st.session_state.local_chat_history:
        st.markdown(f"**{speaker}:** {msg}")
