import { useEffect, useState } from "react";
import { SearchIcon, CheckIcon, Keycap, Logo } from "./Icons.jsx";
import "./CommandPalette.css";

const DEFAULT_RESULTS = [
  { name: "Scale 120", muted: true },
  { name: "Opacity 80", muted: true },
  { name: "Temperature 20", muted: true },
  { name: "Saturation 40", muted: true }
];

export default function CommandPalette({
  variant = "hero",
  query = "Gaussian Blur 30",
  selected = "Gaussian Blur 30",
  applied = false,
  animate = false,
  footerCount = "1 effect",
  showResults = true,
  className = ""
}) {
  const [typed, setTyped] = useState(animate ? "" : query);
  const [showSelected, setShowSelected] = useState(!animate);
  const [isApplied, setIsApplied] = useState(applied);

  useEffect(() => {
    if (!animate) {
      setTyped(query);
      setShowSelected(true);
      setIsApplied(applied);
      return;
    }

    let cancelled = false;
    let selectTimer;
    let applyTimer;
    let resetTimer;
    let loopTimer;

    function runCycle() {
      if (cancelled) return;
      let i = 0;
      setTyped("");
      setShowSelected(false);
      setIsApplied(false);

      const typeTimer = setInterval(() => {
        if (cancelled) {
          clearInterval(typeTimer);
          return;
        }
        i += 1;
        setTyped(query.slice(0, i));
        if (i >= query.length) {
          clearInterval(typeTimer);
          selectTimer = setTimeout(() => {
            if (!cancelled) setShowSelected(true);
          }, 400);
          applyTimer = setTimeout(() => {
            if (!cancelled) setIsApplied(true);
          }, 1400);
          resetTimer = setTimeout(() => {
            if (!cancelled) runCycle();
          }, 4200);
        }
      }, 70);
    }

    runCycle();

    return () => {
      cancelled = true;
      clearTimeout(selectTimer);
      clearTimeout(applyTimer);
      clearTimeout(resetTimer);
      clearTimeout(loopTimer);
    };
  }, [animate, query, applied]);

  const displayApplied = animate ? isApplied : applied;

  return (
    <div className={`palette palette--${variant} ${className}`.trim()} role="presentation">
      <div className="palette-search">
        <span className="palette-search-icon">
          <SearchIcon />
        </span>
        <span className="palette-search-text">
          {typed}
          {animate && typed.length < query.length ? <span className="palette-caret" /> : null}
        </span>
        <Keycap>esc</Keycap>
      </div>

      {showResults && showSelected ? (
        <div className={`palette-result ${displayApplied ? "is-applied" : "is-selected"}`}>
          <div className="palette-result-main">
            <span className={`palette-dot ${displayApplied ? "is-check" : ""}`}>
              {displayApplied ? <CheckIcon /> : null}
            </span>
            <span className="palette-result-name">{selected}</span>
          </div>
          <span className="palette-result-action">
            {displayApplied ? (
              <>
                <CheckIcon /> Applied
              </>
            ) : (
              <>
                <Keycap>↵</Keycap> Apply
              </>
            )}
          </span>
        </div>
      ) : null}

      {showResults && variant === "hero" ? (
        <div className="palette-list">
          {DEFAULT_RESULTS.map((item) => (
            <div key={item.name} className="palette-list-row">
              <span className="palette-list-icon" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="palette-footer">
        <span className="palette-footer-brand">
          <Logo size="sm" />
          <span className="palette-footer-count">{footerCount}</span>
        </span>
        <span className="palette-footer-action">
          Apply <Keycap>↵</Keycap>
        </span>
      </div>
    </div>
  );
}
