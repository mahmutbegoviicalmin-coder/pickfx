import { useCallback, useState } from "react";
import PanelDemo, { PANEL_QUERIES } from "../components/PanelDemo.jsx";
import "./Showcase.css";

const COMMANDS = [
  { label: "Gaussian Blur", value: "30" },
  { label: "Scale", value: "120" },
  { label: "Opacity", value: "80" },
  { label: "Temperature", value: "20" },
  { label: "Saturation", value: "40" }
];

export default function Showcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const onActiveIndexChange = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  return (
    <section className="section showcase" id="showcase">
      <div className="container showcase-inner reveal">
        <div className="showcase-copy">
          <h2 className="showcase-title">
            <span>It understands what you mean.</span>
          </h2>
          <p className="showcase-subtitle">
            Effects, parameters and values from one command bar.
          </p>
          <div className="showcase-params" data-showcase-params>
            {COMMANDS.map((item, i) => (
              <div
                className={`showcase-param${i === activeIndex ? " is-active" : ""}`}
                key={item.label}
                data-showcase-param={i}
              >
                <span className="showcase-param-label">{item.label}</span>
                <span className="showcase-param-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="showcase-visual">
          <PanelDemo
            animate
            variant="showcase"
            queries={PANEL_QUERIES}
            onActiveIndexChange={onActiveIndexChange}
          />
        </div>
      </div>
    </section>
  );
}
