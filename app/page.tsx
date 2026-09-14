import LandingHeader from "../components/landing/LandingHeader";
import LandingHero from "../components/landing/LandingHero";
import JourneySteps from "../components/landing/JourneySteps";
import LearningFeatures from "../components/landing/LearningFeatures";
import WorldExplorer from "../components/landing/WorldExplorer";
import StartJourney from "../components/landing/StartJourney";
import LandingFooter from "../components/landing/LandingFooter";


export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />
      <LandingHero />
      <JourneySteps />
      <LearningFeatures />
      <WorldExplorer />
      <StartJourney />
      <LandingFooter/>
    </main>
  );
}
