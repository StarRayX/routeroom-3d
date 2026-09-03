import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state-screen">
      <div className="state-card">
        <span className="state-kicker">404</span>
        <h1>This route does not exist</h1>
        <p>
          There is no page here. The planner and its 3D scene live at <code>/planner</code>.
        </p>
        <div className="state-actions">
          <Link href="/planner">Open the planner</Link>
          <Link href="/">Go home</Link>
        </div>
      </div>
    </div>
  );
}
