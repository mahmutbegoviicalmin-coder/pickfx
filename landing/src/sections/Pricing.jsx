import SectionHeading from "../components/SectionHeading.jsx";
import PricingCard from "../components/PricingCard.jsx";
import { CheckIcon } from "../components/Icons.jsx";
import "./Pricing.css";

const INCLUDES = [
  "PickFX Premiere Pro plugin",
  "Effect search and application",
  "Keyboard-first workflow",
  "Future improvements",
  "Simple, focused interface"
];

export default function Pricing() {
  return (
    <section className="section pricing" id="pricing">
      <div className="container reveal">
        <SectionHeading
          eyebrow="PRICING"
          title="Simple, honest pricing."
          subtitle="Two ways to use PickFX. No unnecessary tiers."
          align="center"
        />

        <div className="pricing-grid">
          <PricingCard
            plan="MONTHLY"
            price="$9.99"
            period="/month"
            description="Flexible. Cancel anytime."
            cta="Get PickFX"
          />
          <PricingCard
            plan="LIFETIME"
            price="$59.90"
            period="one-time"
            description="Pay once. Keep PickFX."
            cta="Get Lifetime →"
            featured
            badge="Best value"
          />
        </div>

        <article className="pricing-includes">
          <h3>Every PickFX license includes:</h3>
          <ul>
            {INCLUDES.map((item) => (
              <li key={item}>
                <span className="pricing-check">
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
