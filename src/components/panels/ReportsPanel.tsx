"use client";

import { useEffect, useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { formatRelative } from "@/lib/format";
import type { ReportCategory } from "@/lib/types";

type ReportsPanelProps = {
  prefillSegmentId?: string;
};

const CATEGORY_OPTIONS: ReportCategory[] = ["delay", "blocked_path", "accessibility", "crowding", "weather", "other"];

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function ReportsPanel({ prefillSegmentId }: ReportsPanelProps) {
  const city = usePlanner((s) => s.city);
  const now = usePlanner((s) => s.now);
  const reportDrafts = usePlanner((s) => s.reportDrafts);
  const getRecentReports = usePlanner((s) => s.getRecentReports);
  const draftServiceReport = usePlanner((s) => s.draftServiceReport);
  const publishServiceReport = usePlanner((s) => s.publishServiceReport);
  const discardReportDraft = usePlanner((s) => s.discardReportDraft);

  const allSegments = city.routeOptions.flatMap((route) => route.segments.map((segment) => ({ routeName: route.name, segment })));

  const [segmentId, setSegmentId] = useState(prefillSegmentId ?? allSegments[0]?.segment.id ?? "");
  const [category, setCategory] = useState<ReportCategory>("delay");
  const [text, setText] = useState("");
  const [observedAt, setObservedAt] = useState(toDatetimeLocal(now));
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(new Date(new Date(now).getTime() + 3 * 3_600_000).toISOString()));
  const [resultMessage, setResultMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (prefillSegmentId) setSegmentId(prefillSegmentId);
  }, [prefillSegmentId]);

  const recentReports = getRecentReports();
  const drafts = Object.values(reportDrafts).filter((draft) => draft.status === "draft");

  const handleSaveDraft = () => {
    const result = draftServiceReport(
      {
        segmentId,
        category,
        text,
        observedAt: fromDatetimeLocal(observedAt),
        expiresAt: fromDatetimeLocal(expiresAt),
      },
      "human",
    );
    if (result.status === "ok") {
      setResultMessage(`Draft saved: ${result.data.text}`);
      setText("");
    } else {
      setResultMessage(result.message);
    }
  };

  return (
    <section className="card panel" aria-labelledby="reports-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">SERVICE REPORTS</p>
          <h2 id="reports-heading">Recent observations</h2>
        </div>
      </div>

      <ul className="report-list">
        {recentReports.length === 0 && <li className="empty-note">No active reports right now.</li>}
        {recentReports.map((report) => (
          <li key={report.id} className="report-list-item">
            <span className="chip">{report.category.replace("_", " ")}</span>
            <p>{report.text}</p>
            <div className="report-list-meta">
              <span className={`badge ${report.source === "user" ? "badge-amber" : "badge-teal"}`}>{report.source}</span>
              <span className="route-card-freshness">
                Observed {formatRelative(report.observedAt, new Date(now))} · Expires {formatRelative(report.expiresAt, new Date(now))}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="report-composer">
        <p className="eyebrow">FILE A REPORT</p>

        <label>
          <span>Segment</span>
          <select value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>
            {allSegments.map(({ routeName, segment }) => (
              <option key={segment.id} value={segment.id}>
                {routeName} · {segment.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)}>
            {CATEGORY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>
            Observation ({text.length}/280)
          </span>
          <textarea maxLength={280} value={text} onChange={(event) => setText(event.target.value)} rows={3} />
        </label>

        <div className="report-composer-times">
          <label>
            <span>Observed</span>
            <input type="datetime-local" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} />
          </label>
          <label>
            <span>Expires</span>
            <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
        </div>

        <button type="button" className="secondary-button" onClick={handleSaveDraft} disabled={!segmentId || text.trim().length < 8}>
          Save draft
        </button>
        {resultMessage && <p className="empty-note">{resultMessage}</p>}
      </div>

      {drafts.length > 0 && (
        <div className="draft-list">
          <p className="eyebrow">UNPUBLISHED DRAFTS</p>
          <ul>
            {drafts.map((draft) => (
              <li key={draft.id} className="draft-list-item">
                <div>
                  <span className="chip">{draft.category.replace("_", " ")}</span>
                  <p>{draft.text}</p>
                </div>
                <div className="draft-list-actions">
                  <button type="button" className="secondary-button" onClick={() => publishServiceReport(draft.id, "human")}>
                    Publish
                  </button>
                  <button type="button" className="text-button" onClick={() => discardReportDraft(draft.id, "human")}>
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
