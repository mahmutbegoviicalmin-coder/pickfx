import Button from "./Button.jsx";
import "./PricingCard.css";

export default function PricingCard({
  plan,
  price,
  period,
  description,
  cta,
  featured = false,
  badge
}) {
  return (
    <article className={`pricing-card ${featured ? "is-featured" : ""}`.trim()}>
      {badge ? <span className="pricing-badge">{badge}</span> : null}
      <p className={`pricing-plan ${featured ? "is-accent" : ""}`.trim()}>{plan}</p>
      <div className="pricing-price">
        <span className="pricing-amount">{price}</span>
        <span className="pricing-period">{period}</span>
      </div>
      <p className="pricing-description">{description}</p>
      <Button href="#pricing" variant={featured ? "dark" : "outline"} size="md" className="pricing-cta">
        {cta}
      </Button>
    </article>
  );
}
