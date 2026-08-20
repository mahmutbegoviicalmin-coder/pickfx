import "./FeatureCard.css";

export default function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article className="feature-card">
      <div className="feature-card-icon">
        <Icon />
      </div>
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-copy">{description}</p>
    </article>
  );
}
