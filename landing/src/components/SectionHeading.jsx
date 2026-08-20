import "./SectionHeading.css";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = ""
}) {
  const lines = Array.isArray(title) ? title : [title];

  return (
    <div className={`section-heading section-heading--${align} ${className}`.trim()}>
      {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
      <h2 className="section-title">
        {lines.map((line, i) => (
          <span key={i} className="section-title-line">
            {line}
          </span>
        ))}
      </h2>
      {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
    </div>
  );
}
