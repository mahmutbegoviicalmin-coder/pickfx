import Button from "../components/Button.jsx";
import "./FinalCTA.css";

export default function FinalCTA() {
  return (
    <section className="section final-cta">
      <div className="container final-cta-inner reveal">
        <h2>
          <span>Stop looking for effects.</span>
          <span>Just apply them.</span>
        </h2>
        <p>PickFX puts your effects and parameters one shortcut away.</p>
        <Button href="#pricing" variant="dark" size="lg">
          Get PickFX →
        </Button>
      </div>
    </section>
  );
}
