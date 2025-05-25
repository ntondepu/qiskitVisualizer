import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/init-circuit', (req, res) => {
    const num_qubits = req.body.num_qubits || 2;
    res.json({
        success: true,
        message: `Initialized ${num_qubits} qubits`
    });
});

app.listen(5000, () => {
    console.log('Backend running on http://localhost:5000');
});
