import { Logo } from "./Icons.jsx";
import "./Footer.css";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "mailto:support@pickfx.app", label: "Support" },
  { href: "#privacy", label: "Privacy" },
  { href: "#terms", label: "Terms" },
  { href: "#refunds", label: "Refunds" }
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="footer-tagline">Apply effects. Without the digging.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <p className="footer-copy">© 2026 PickFX</p>
      </div>
    </footer>
  );
}
