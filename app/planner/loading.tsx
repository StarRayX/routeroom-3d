export default function PlannerLoading() {
  return (
    <div className="state-screen" aria-busy="true" aria-live="polite">
      <div className="state-card" style={{ maxWidth: "40rem", width: "100%" }}>
        <span className="state-kicker">Loading</span>
        <h1>Setting up the route room</h1>
        <p>Loading the city pack, ranking route candidates, and preparing the 3D scene.</p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div className="state-skeleton" style={{ height: "12rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <div className="state-skeleton" style={{ height: "5rem" }} />
            <div className="state-skeleton" style={{ height: "5rem" }} />
            <div className="state-skeleton" style={{ height: "5rem" }} />
          </div>
          <div className="state-skeleton" style={{ height: "1rem", width: "70%" }} />
          <div className="state-skeleton" style={{ height: "1rem", width: "45%" }} />
        </div>
      </div>
    </div>
  );
}
