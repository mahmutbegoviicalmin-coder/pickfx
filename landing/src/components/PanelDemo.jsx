import { useEffect, useState } from "react";
import lightLogo from "../assets/pickfx-logo-light.png";
import "./PanelDemo.css";

export const PANEL_QUERIES = [
  "Gaussian Blur 30",
  "Scale 120",
  "Opacity 80",
  "Temperature 20",
  "Saturation 40"
];

const SW = "1.5";

function svg(inner) {
  return (
    <svg className="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {inner}
    </svg>
  );
}

const ICONS = {
  blur: svg(
    <>
      <circle cx="7.1" cy="7.1" r="3.05" stroke="currentColor" strokeWidth={SW} fill="none" />
      <circle cx="8.35" cy="6.2" r="3.05" stroke="currentColor" strokeWidth={SW} fill="none" />
      <path d="M10.55 10.35L13.15 13" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
    </>
  ),
  scale: svg(
    <>
      <path d="M3.2 6.35V3.2H6.35M9.65 3.2H12.8V6.35M12.8 9.65V12.8H9.65M6.35 12.8H3.2V9.65" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  opacity: svg(
    <>
      <path d="M3.7 5.45h6.4v6.4H3.7Z" stroke="currentColor" strokeWidth={SW} fill="none" />
      <path d="M5.85 4.15h6.45v6.45" stroke="currentColor" strokeWidth={SW} fill="none" />
    </>
  ),
  temperature: svg(
    <>
      <path d="M8 2.7c-.72 0-1.3.58-1.3 1.3v5.45a2.35 2.35 0 1 0 2.6 0V4c0-.72-.58-1.3-1.3-1.3Z" stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6.35v2.55M10.15 4.35h1.15M10.15 5.7h1.15" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
    </>
  ),
  saturation: svg(
    <>
      <path d="M8 2.9c2.15 2.35 3.25 3.85 3.25 5.7A3.25 3.25 0 1 1 4.75 8.6C4.75 6.75 5.85 5.25 8 2.9Z" stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.85 9.15h2.3" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
    </>
  ),
  search: svg(
    <>
      <circle cx="6.85" cy="6.85" r="4.15" stroke="currentColor" strokeWidth={SW} fill="none" />
      <path d="M10.05 10.05L13.25 13.25" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
    </>
  ),
  ellipsis: svg(
    <>
      <circle cx="3.5" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" />
    </>
  ),
  check: svg(
    <path
      className="check-path"
      d="M3.4 8.2l2.8 2.8 6.4-6.45"
      stroke="currentColor"
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  )
};

function iconForQuery(query) {
  const q = String(query || "").toLowerCase();
  if (q.includes("blur")) return ICONS.blur;
  if (q.includes("scale")) return ICONS.scale;
  if (q.includes("opacity")) return ICONS.opacity;
  if (q.includes("temperature")) return ICONS.temperature;
  if (q.includes("saturation")) return ICONS.saturation;
  return ICONS.saturation;
}

function ResultRow({ query, selected, muted, success }) {
  return (
    <div
      className={`panel-demo-row${selected ? " is-selected" : ""}${muted ? " is-muted" : ""}${success ? " is-success" : ""}`}
      data-kind={success ? "command-result" : muted ? "recent-command" : "effect"}
    >
      <span className="panel-demo-icon-well">
        <span className="panel-demo-effect-icon">{success ? ICONS.check : iconForQuery(query)}</span>
      </span>
      <div className="panel-demo-result-body">
        <span className="panel-demo-effect-name">{query}</span>
        {success ? <span className="panel-demo-result-sub">Applied successfully</span> : null}
        {muted ? <span className="panel-demo-result-sub">Recent</span> : null}
      </div>
      {selected && !success ? (
        <span className="panel-demo-action">
          Apply <span className="keycap">↵</span>
        </span>
      ) : null}
    </div>
  );
}

export default function PanelDemo({
  animate = true,
  variant = "hero",
  query: queryProp,
  queries = PANEL_QUERIES,
  onActiveIndexChange
}) {
  const [queryIndex, setQueryIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [showCaret, setShowCaret] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const list = queries.length ? queries : PANEL_QUERIES;
  const query = queryProp || list[queryIndex % list.length];
  const mutedLimit = variant === "compare" ? 3 : 4;
  const mutedRows = list.filter((name) => name !== query).slice(0, mutedLimit);
  const isCompact = variant === "compare" || variant === "showcase";

  useEffect(() => {
    onActiveIndexChange?.(queryIndex % list.length);
  }, [queryIndex, list.length, onActiveIndexChange]);

  useEffect(() => {
    if (!animate) {
      setTyped(query);
      setShowCaret(false);
      setShowResult(true);
      setIsSelected(false);
      setIsApplied(true);
      return;
    }

    let cancelled = false;
    const timers = [];

    function later(fn, ms) {
      const id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function runCycle(current) {
      if (cancelled) return;
      let i = 0;
      setTyped("");
      setShowCaret(true);
      setShowResult(false);
      setIsSelected(false);
      setIsApplied(false);

      const typeTimer = setInterval(() => {
        if (cancelled) {
          clearInterval(typeTimer);
          return;
        }
        i += 1;
        setTyped(current.slice(0, i));
        if (i >= 1) {
          setShowResult(true);
          setIsSelected(true);
          setIsApplied(false);
        }
        if (i >= current.length) {
          clearInterval(typeTimer);
          setShowCaret(false);
          later(() => {
            if (cancelled) return;
            setIsSelected(false);
            setIsApplied(true);
          }, 700);
          later(() => {
            if (cancelled) return;
            let j = current.length;
            setShowCaret(true);
            setShowResult(false);
            setIsSelected(false);
            setIsApplied(false);
            const eraseTimer = setInterval(() => {
              if (cancelled) {
                clearInterval(eraseTimer);
                return;
              }
              j -= 1;
              setTyped(current.slice(0, Math.max(0, j)));
              if (j <= 0) {
                clearInterval(eraseTimer);
                later(() => {
                  if (cancelled) return;
                  setQueryIndex((n) => (n + 1) % list.length);
                }, 320);
              }
            }, 28);
            timers.push(eraseTimer);
          }, 2400);
        }
      }, 55);
      timers.push(typeTimer);
    }

    runCycle(query);

    return () => {
      cancelled = true;
      timers.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
    };
  }, [animate, query, list.length]);

  const variantClass =
    variant === "compare"
      ? " panel-demo--compare"
      : variant === "showcase"
        ? " panel-demo--showcase"
        : "";

  return (
    <div className={`panel-demo${variantClass}`} aria-label="PickFX panel preview">
      <div className="panel-demo-header">
        <div className="panel-demo-brand">
          <img src={lightLogo} alt="" width={isCompact ? 24 : 28} height={isCompact ? 24 : 28} />
          <span>PickFX</span>
        </div>
        <span className="panel-demo-menu" aria-hidden="true">
          {ICONS.ellipsis}
        </span>
      </div>
      <div className="panel-demo-search">
        <span className="panel-demo-search-icon" aria-hidden="true">
          {ICONS.search}
        </span>
        <span className="panel-demo-query">
          {typed}
          {showCaret ? <span className="palette-caret" aria-hidden="true" /> : null}
        </span>
        <span className="panel-demo-esc">esc</span>
      </div>
      <div className="panel-demo-results">
        {showResult && isApplied ? <ResultRow query={query} success /> : null}
        {showResult && !isApplied ? <ResultRow query={query} selected={isSelected} /> : null}
        {showResult && !isApplied
          ? mutedRows.map((name) => <ResultRow key={name} query={name} muted />)
          : null}
      </div>
      <div className="panel-demo-footer">
        <span className="panel-demo-footer-brand">
          <img src={lightLogo} alt="" width={12} height={12} />
          <span>PickFX</span>
          <span className="panel-demo-sep">·</span>
          <span className="panel-demo-count">{showResult ? "1 effect" : "0 effects"}</span>
        </span>
        <span className="panel-demo-footer-action">
          Apply <span className="panel-demo-key">↵</span>
        </span>
      </div>
    </div>
  );
}
