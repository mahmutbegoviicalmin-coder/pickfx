import "./MotionValues.css";

const CONTROLS = [
  { label: "Position", value: "960 540" },
  { label: "Scale", value: "120" },
  { label: "Rotation", value: "15" },
  { label: "Anchor Point", value: "0.5 0.5" },
  { label: "Opacity", value: "80" }
];

export default function MotionValues() {
  return (
    <section className="section motion-values" id="motion-values">
      <div className="container motion-values-inner reveal">
        <div className="motion-values-copy">
          <h2 className="motion-values-title">
            Change values across clips without touching the Effect Controls panel.
          </h2>
          <h3 className="motion-values-subtitle">
            Control position, scale, rotation, anchor point, and opacity with direct value entry so
            repetitive animation tweaks take seconds instead of minutes.
          </h3>
        </div>
        <div className="motion-values-list" aria-hidden="true">
          {CONTROLS.map((item) => (
            <div className="motion-values-item" key={item.label}>
              <span className="motion-values-label">{item.label}</span>
              <span className="motion-values-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
