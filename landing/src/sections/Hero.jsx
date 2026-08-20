import Button from "../components/Button.jsx";
import PanelDemo from "../components/PanelDemo.jsx";
import prLogo from "../assets/pr-logo.webp";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero section" id="hero">
      <div className="container hero-inner reveal is-visible">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            <img className="hero-pr-logo" src={prLogo} alt="" width="18" height="18" aria-hidden="true" />
            Built for Adobe Premiere Pro
          </p>
          <h1 className="hero-title">
            <span className="hero-title-primary">Find any effect.</span>
            <span className="hero-title-secondary">Apply it instantly.</span>
          </h1>
          <p className="hero-subtitle">
            PickFX gives you a faster way to find and apply Premiere Pro effects and parameters, right from your keyboard.
          </p>
          <div className="hero-actions">
            <Button href="#pricing" variant="dark" size="lg">
              Get PickFX →
            </Button>
            <Button href="#how-it-works" variant="ghost" size="lg">
              See how it works
            </Button>
          </div>
          <p className="hero-pricing">$9.99/month · $59.90 one-time</p>
        </div>

        <div className="hero-visual">
          <div className="hero-premiere" aria-hidden="true">
            <div className="premiere-toolbar" />
            <div className="premiere-body">
              <div className="premiere-panel" />
              <div className="premiere-timeline">
                <div className="premiere-track" />
                <div className="premiere-track is-active" />
                <div className="premiere-track" />
              </div>
            </div>
          </div>
          <PanelDemo animate />
        </div>
      </div>
    </section>
  );
}
