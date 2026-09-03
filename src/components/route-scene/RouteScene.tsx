"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { RouteOption, RouteSegment } from "@/lib/types";
import type { RouteSceneProps } from "./types";
import { SceneContent } from "./SceneContent";
import { RouteMap2D } from "./RouteMap2D";
import { PALETTE } from "./palette";
import "./route-scene.css";

function findSegment(
  routes: RouteOption[],
  segmentId: string,
): { route: RouteOption; segment: RouteSegment } | undefined {
  for (const route of routes) {
    const segment = route.segments.find((candidate) => candidate.id === segmentId);
    if (segment) return { route, segment };
  }
  return undefined;
}

function detectWebGl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Top-level 3D route scene. Wraps the Canvas, detects WebGL support (falling
 * back to the 2D SVG map when it is unavailable), and renders the overlay
 * chrome: legend, reset button, and a live caption describing camera state.
 */
export function RouteScene(props: RouteSceneProps) {
  const { city, routes, focusedSegmentId, cameraTarget, onWebGlUnavailable, reducedMotion: reducedMotionProp } = props;

  const [mounted, setMounted] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const notifiedUnavailable = useRef(false);

  useEffect(() => {
    setMounted(true);
    setWebglAvailable(detectWebGl());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (mounted && webglAvailable === false && !notifiedUnavailable.current) {
      notifiedUnavailable.current = true;
      onWebGlUnavailable?.();
    }
  }, [mounted, webglAvailable, onWebGlUnavailable]);

  const reducedMotion = reducedMotionProp ?? prefersReducedMotion;

  const caption = useMemo(() => {
    if (focusedSegmentId) {
      const found = findSegment(routes, focusedSegmentId);
      if (found) {
        return { title: "Focused segment", detail: `${found.segment.label} on ${found.route.name}` };
      }
    }
    if (cameraTarget) {
      const landmark = city.landmarks.find((candidate) => candidate.id === cameraTarget);
      if (landmark) {
        return { title: "Viewing", detail: landmark.name };
      }
    }
    return { title: "Overview", detail: `${city.name}, ${city.district}` };
  }, [focusedSegmentId, cameraTarget, routes, city]);

  if (!mounted) {
    return (
      <div className="rs-shell" aria-label={`${city.name} route scene`}>
        <div className="rs-loading">Loading scene…</div>
      </div>
    );
  }

  if (webglAvailable === false) {
    return <RouteMap2D {...props} reducedMotion={reducedMotion} />;
  }

  return (
    <div className="rs-shell" aria-label={`${city.name} interactive route scene`}>
      <Canvas camera={{ position: [10.5, 11.5, 13], fov: 40 }} dpr={[1, 1.75]} shadows>
        <SceneContent {...props} reducedMotion={reducedMotion} resetSignal={resetSignal} />
      </Canvas>

      <div className="rs-overlay">
        <div className="rs-topbar">
          <div className="rs-caption" role="status" aria-live="polite">
            <strong>{caption.title}.</strong> {caption.detail}
          </div>
          <button
            type="button"
            className="rs-reset-btn"
            onClick={() => setResetSignal((count) => count + 1)}
          >
            Reset view
          </button>
        </div>

        <div className="rs-legend" aria-label="Scene legend">
          <span className="rs-legend-item">
            <i className="rs-legend-swatch" style={{ backgroundColor: PALETTE.legendInk }} />
            Primary route
          </span>
          <span className="rs-legend-item">
            <i
              className="rs-legend-swatch rs-legend-swatch--dashed"
              style={{ backgroundColor: PALETTE.legendInk, opacity: 0.75 }}
            />
            Backup route
          </span>
          <span className="rs-legend-item">
            <i
              className="rs-legend-swatch"
              style={{ backgroundColor: PALETTE.candidateRoute, opacity: 0.4 }}
            />
            Candidate route
          </span>
          <span className="rs-legend-item">
            <i className="rs-legend-dot" style={{ backgroundColor: PALETTE.reportMarker }} />
            Report marker
          </span>
          <span className="rs-legend-item">
            <i
              className="rs-legend-dot"
              style={{ backgroundColor: PALETTE.focusHalo, boxShadow: "0 0 0 1px #c9b98a inset" }}
            />
            Focus
          </span>
        </div>
      </div>
    </div>
  );
}
