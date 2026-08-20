import { useState } from "react";
import "./FAQItem.css";

export default function FAQItem({ question, answer, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `faq-${question.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className={`faq-item ${open ? "is-open" : ""}`.trim()}>
      <button
        type="button"
        className="faq-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{question}</span>
        <span className="faq-icon" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={panelId} className="faq-panel" hidden={!open}>
        <p>{answer}</p>
      </div>
    </div>
  );
}
