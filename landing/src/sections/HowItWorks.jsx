import SectionHeading from "../components/SectionHeading.jsx";
import PanelDemo from "../components/PanelDemo.jsx";
import { IconCursor, IconCommand, IconReturn, CheckIcon } from "../components/Icons.jsx";
import "./HowItWorks.css";

const STEPS = [
  {
    num: "01",
    icon: IconCursor,
    title: "Select",
    copy: "Select a clip."
  },
  {
    num: "02",
    icon: IconCommand,
    title: "Search",
    copy: "Type the effect or parameter you need."
  },
  {
    num: "03",
    icon: IconReturn,
    title: "Apply",
    copy: "Press Enter. Keep editing."
  }
];

export default function HowItWorks() {
  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container reveal">
        <SectionHeading eyebrow="HOW IT WORKS" title="Three steps. That's it." />
        <div className="steps-grid">
          {STEPS.map((step) => (
            <article key={step.num} className="step-card">
              <div className="step-card-top">
                <span className="step-num">{step.num}</span>
                <span className="step-icon">
                  <step.icon />
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>

        <div className="workflow-demo">
          <div className="workflow-clip">
            <p className="workflow-label">Clip: Interview_02</p>
            <div className="workflow-clip-frame">
              <span className="workflow-time">00:00:12:04</span>
            </div>
            <p className="workflow-caption">Selected clip receives the effect.</p>
          </div>

          <PanelDemo animate={false} variant="showcase" query="Gaussian Blur 30" />

          <div className="workflow-applied">
            <p className="workflow-label">EFFECT APPLIED</p>
            <div className="workflow-applied-row">
              <span className="workflow-check">
                <CheckIcon />
              </span>
              <div>
                <strong>Gaussian Blur 30</strong>
                <p>Added to selected clip</p>
              </div>
            </div>
            <div className="workflow-params">
              <span>Blur 30</span>
              <span>Opacity 80</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
