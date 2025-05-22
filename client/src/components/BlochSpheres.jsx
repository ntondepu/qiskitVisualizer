export default function BlochSpheres({ spheres }) {
  return (
    <div className="bloch-spheres">
      <h3>Qubit States</h3>
      <div className="spheres-container">
        {spheres.map((img, idx) => (
          <div key={idx} className="bloch-sphere">
            <h4>Qubit {idx}</h4>
            <img src={`data:image/png;base64,${img}`} alt={`Qubit ${idx} state`} />
          </div>
        ))}
      </div>
    </div>
  );
}
