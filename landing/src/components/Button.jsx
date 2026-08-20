import "./Button.css";

export default function Button({
  children,
  href,
  variant = "dark",
  size = "md",
  className = "",
  ...props
}) {
  const cls = ["btn", `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
