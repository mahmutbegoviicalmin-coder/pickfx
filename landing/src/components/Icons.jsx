import pickfxLogo from "../assets/pickfx-logo-dark.png";

export function Logo({ size = "md" }) {
  const dim = size === "sm" ? 18 : 52;
  const img = size === "sm" ? 18 : 52;

  return (
    <span className={`logo logo--${size}`}>
      <span className="logo-mark" style={{ width: dim, height: dim }}>
        <img src={pickfxLogo} alt="" width={img} height={img} aria-hidden="true" />
      </span>
      <span className="logo-word">PickFX</span>
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.75" cy="7.75" r="4.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.5 11.5L15.25 15.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.2l2.8 2.8 6.2-6.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Keycap({ children }) {
  return <span className="keycap">{children}</span>;
}

export function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.75" cy="7.75" r="4.75" stroke="currentColor" strokeWidth="1.35" />
      <path d="M11.5 11.5L15.25 15.25" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function IconKeyboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.35" />
      <path d="M5 8.5h8M5 11h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function IconFilm() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.35" />
      <path d="M6 4v10M12 4v10M2.5 7.5h13M2.5 10.5h13" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

export function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M10 2.5L5 9.5h3.5L7.5 15.5l5.5-7H9.5L10 2.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 3L3 6.5 9 10l6-3.5L9 3Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M3 10.5 9 14l6-3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFocus() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.5 6.5V3.5h3M14.5 6.5V3.5h-3M14.5 11.5v3h-3M3.5 11.5v3h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <rect x="6.5" y="6.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

export function IconCursor() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 3.5l10 5.5-4.5 1.5L8 14.5 4 3.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCommand() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6 5.5a2 2 0 1 0 0 4M12 5.5a2 2 0 1 0 0 4M5.5 12h7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function IconReturn() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 6.5h7a3 3 0 0 1 0 6H9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M6.5 8.5 4 6.5l2.5-2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
