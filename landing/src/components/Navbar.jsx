import { Logo } from "./Icons.jsx";
import Button from "./Button.jsx";
import "./Navbar.css";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" }
];

export default function Navbar() {
  return (
    <header className="navbar" id="top">
      <div className="container navbar-inner">
        <a href="#top" className="navbar-brand" aria-label="PickFX home">
          <Logo />
        </a>

        <nav className="navbar-links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="navbar-link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar-actions">
          <Button href="#pricing" variant="dark" size="sm">
            Get PickFX
          </Button>
          <button
            type="button"
            className="navbar-toggle"
            aria-label="Open menu"
            aria-expanded="false"
            aria-controls="mobile-menu"
            onClick={() => {
              const menu = document.getElementById("mobile-menu");
              const btn = document.querySelector(".navbar-toggle");
              const open = menu?.classList.toggle("is-open");
              btn?.setAttribute("aria-expanded", open ? "true" : "false");
            }}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className="mobile-menu" id="mobile-menu">
        <nav aria-label="Mobile">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="mobile-menu-link"
              onClick={() => {
                document.getElementById("mobile-menu")?.classList.remove("is-open");
                document.querySelector(".navbar-toggle")?.setAttribute("aria-expanded", "false");
              }}
            >
              {link.label}
            </a>
          ))}
          <Button href="#pricing" variant="dark" size="md" className="mobile-menu-cta">
            Get PickFX
          </Button>
        </nav>
      </div>
    </header>
  );
}
