import SectionHeading from "../components/SectionHeading.jsx";
import PanelDemo from "../components/PanelDemo.jsx";
import "./Difference.css";

const OLD_STEPS = ["Open Effects", "Search", "Find", "Drag", "Repeat"];

export default function Difference() {
  return (
    <section className="section difference" id="difference">
      <div className="container reveal">
        <SectionHeading
          eyebrow="THE PROBLEM"
          title={["You already know the effect.", "Why are you still looking for it?"]}
        />
        <div className="difference-grid">
          <article className="compare-card compare-card--old">
            <p className="compare-label">THE OLD WAY</p>
            <ol className="compare-steps">
              {OLD_STEPS.map((step, i) => (
                <li key={step}>
                  <span className="compare-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="compare-foot">Five steps. Every clip. Every time.</p>
          </article>

          <article className="compare-card compare-card--new">
            <p className="compare-label is-accent">PICKFX</p>
            <PanelDemo animate={false} variant="compare" />
            <p className="compare-foot is-accent">
              <span className="compare-foot-icon" aria-hidden="true">
                ⚡
              </span>
              Search. Select. Apply.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
