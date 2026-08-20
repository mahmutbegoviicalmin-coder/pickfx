import SectionHeading from "../components/SectionHeading.jsx";
import FAQItem from "../components/FAQItem.jsx";
import "./FAQ.css";

const ITEMS = [
  {
    question: "What is PickFX?",
    answer:
      "PickFX is a Premiere Pro plugin that lets you search for effects and parameters, then apply them to the selected clip from a keyboard-first command palette.",
    defaultOpen: true
  },
  {
    question: "Does PickFX work with Adobe Premiere Pro?",
    answer: "Yes. PickFX is built specifically for Adobe Premiere Pro."
  },
  {
    question: "Does PickFX use AI?",
    answer:
      "No. PickFX is not an AI product. It is a focused utility for finding and applying effects and parameters you already know."
  },
  {
    question: "Can I use PickFX with keyboard shortcuts?",
    answer:
      "Yes. PickFX is designed to be keyboard-first. Open it, search, and apply without leaving your timeline."
  },
  {
    question: "Does PickFX work with the effects already available in Premiere Pro?",
    answer:
      "Yes. PickFX works with the effects and parameters already available in your Premiere Pro workflow."
  },
  {
    question: "Does PickFX change my Premiere Pro project?",
    answer:
      "PickFX applies effects and parameter values to the clip you select. It does not restructure your project or replace Premiere Pro."
  },
  {
    question: "What are the pricing options?",
    answer:
      "PickFX is available for $9.99/month or as a $59.90 one-time lifetime license."
  },
  {
    question: "Who is PickFX for?",
    answer:
      "PickFX is for Premiere Pro editors who already know the effect or parameter they want, and want a faster way to apply it."
  }
];

export default function FAQ() {
  return (
    <section className="section faq-section" id="faq">
      <div className="container faq-inner reveal">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <div className="faq-list">
          {ITEMS.map((item) => (
            <FAQItem key={item.question} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
