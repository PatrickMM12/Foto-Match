import React from 'react';
import HeroSection from '@/components/home/hero-section';
import FeaturesSection from '@/components/home/features-section';
import HowItWorksSection from '@/components/home/how-it-works-section';
import TestimonialsSection from '@/components/home/testimonials-section';
import PricingSection from '@/components/home/pricing-section';
import CtaSection from '@/components/home/cta-section';

const Home = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
    </div>
  );
};

export default Home;
