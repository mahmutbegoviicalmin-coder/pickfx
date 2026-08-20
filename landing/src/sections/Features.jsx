import SectionHeading from "../components/SectionHeading.jsx";
import FeatureCard from "../components/FeatureCard.jsx";
import {
  IconSearch,
  IconKeyboard,
  IconFilm,
  IconLayers
} from "../components/Icons.jsx";
import "./Features.css";

const FEATURES = [
  {
    icon: IconSearch,
    title: "Instant Effect Search",
    description: "Find the effect you need without navigating through the Effects panel."
  },
  {
    icon: IconLayers,
    title: "Command-Based Controls",
    description: "Type commands such as Gaussian Blur 30, Scale 120 or Opacity 80."
  },
  {
    icon: IconKeyboard,
    title: "Keyboard First",
    description: "Open, search and apply without leaving your timeline."
  },
  {
    icon: IconFilm,
    title: "Built for Premiere Pro",
    description: "Designed around the way Premiere Pro editors already work."
  }
];

export default function Features() {
  return (
    <section className="section features" id="features">
      <div className="container reveal">
        <SectionHeading
          eyebrow="WHAT PICKFX DOES"
          title="More than effect search."
        />
        <div className="features-grid features-grid--four">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
