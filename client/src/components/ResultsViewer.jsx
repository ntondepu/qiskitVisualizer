export default function ResultsViewer({ counts, histogram }) {
  return (
    <div className="results-viewer">
      <h3>Measurement Results</h3>
      <div className="results-grid">
        <div className="counts-table">
          <h4>Counts</h4>
          <ul>
            {Object.entries(counts).map(([state, count]) => (
              <li key={state}>{state}: {count}</li>
            ))}
          </ul>
        </div>
        <div className="histogram">
          <h4>Distribution</h4>
          <img src={`data:image/png;base64,${histogram}`} alt="Measurement histogram" />
        </div>
      </div>
    </div>
  );
}
