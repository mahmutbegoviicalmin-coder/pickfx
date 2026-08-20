import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Hero from "./sections/Hero.jsx";
import Features from "./sections/Features.jsx";
import Difference from "./sections/Difference.jsx";
import MotionValues from "./sections/MotionValues.jsx";
import HowItWorks from "./sections/HowItWorks.jsx";
import Showcase from "./sections/Showcase.jsx";
import Pricing from "./sections/Pricing.jsx";
import FAQ from "./sections/FAQ.jsx";
import FinalCTA from "./sections/FinalCTA.jsx";
import "./App.css";

export default function App() {
  useEffect(() => {
    const navbar = document.querySelector(".navbar");
    const onScroll = () => {
      navbar?.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    document.querySelector(".hero .reveal")?.classList.add("is-visible");

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Difference />
        <MotionValues />
        <Showcase />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <section className="section legal-stubs" aria-label="Legal">
          <div className="container">
            <div className="legal-block" id="privacy">
              <h2>Privacy</h2>
              <p>PickFX respects your privacy. Contact support@pickfx.app for privacy questions.</p>
            </div>
            <div className="legal-block" id="terms">
              <h2>Terms</h2>
              <p>
                By purchasing PickFX, you agree to use the product for your own Premiere Pro
                workflow. Contact support@pickfx.app for licensing questions.
              </p>
            </div>
            <div className="legal-block" id="refunds">
              <h2>Refunds</h2>
              <p>For refund requests, contact support@pickfx.app.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
