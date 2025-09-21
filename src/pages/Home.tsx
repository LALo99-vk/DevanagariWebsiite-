import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Leaf,
  Shield,
  Bone,
  Wheat,
  ArrowRight,
} from "lucide-react";
import millets from "../assets/millet.png";
import grinding from "../assets/grinding1.png";
import finepowder from "../assets/powderMix.png .png";
import heromain3 from "../assets/heromain3.png";
import heroVideo from "../assets/videos/compressed-hero-bg.mp4";

const Home = () => {
  const benefits = [
    {
      icon: Leaf,
      title: "21 Natural Ingredients",
      description:
        "Carefully selected grains, millets, and pulses for complete nutrition",
    },
    {
      icon: Shield,
      title: "Zero Sugar & Cholesterol",
      description:
        "Pure ingredients with no artificial additives or harmful substances",
    },
    {
      icon: Bone,
      title: "Protein-Packed Nutrition",
      description:
        "Iron-strong, calcium-rich formula perfect for every fitness journey",
    },
    {
      icon: Wheat,
      title: "Gluten-Free & Wholesome",
      description:
        "Balanced nutrition for all, delivering wellness in every sip",
    },
  ];

  return (
    <div className="bg-[#FDFBF8] overflow-x-hidden">
      {/* Hero Section - Keep as provided */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Professional Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>

        {/* Subtle Pattern Overlay for Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)]"></div>

        {/* Content Container */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[80vh]">
            {/* Left Content - Takes up more space */}
            <div className="lg:col-span-7 space-y-8">
              {/* Badge/Tag */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="text-white/90 text-sm font-medium tracking-wide">
                  100% Natural • 21 Ingredients • Traditional Recipe
                </span>
              </div>

              {/* Main Heading */}
              <div className="space-y-4 sm:space-y-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[0.9] tracking-tight">
                  Wellness,
                  <br />
                  <span className="text-[#CDE0B7]">Rooted in</span>
                  <br />
                  Tradition
                </h1>

                <div className="h-1 w-16 sm:w-24 bg-gradient-to-r from-[#CDE0B7] to-[#F6CFA7] rounded-full"></div>

                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#F6CFA7] font-bold tracking-wider">
                  FUELS HEALTH. POWERS LIFE.
                </p>
              </div>

              {/* Description */}
              <div className="max-w-2xl">
                <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed font-light">
                  Discover the power of{" "}
                  <span className="font-semibold text-[#CDE0B7]">
                    21 natural grains
                  </span>
                  , millets, and pulses in a single, nourishing mix. Inspired by
                  nature and rooted in tradition, Devanagari Health Mix is your
                  gateway to vibrant wellness.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button className="group bg-gradient-to-r from-[#4A5C3D] to-[#5d7249] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold hover:from-[#3a4a2f] hover:to-[#4a5d3a] transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 shadow-2xl hover:shadow-3xl transform hover:scale-105 backdrop-blur-sm">
                  <ShoppingBag
                    size={18}
                    className="sm:w-5 sm:h-5 group-hover:animate-bounce"
                  />
                  <span className="font-bold tracking-wide">
                    <Link to="/shop">Shop Now</Link>
                  </span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 pt-6 sm:pt-8">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#CDE0B7] rounded-full animate-pulse"></div>
                  <span className="text-white/80 text-xs sm:text-sm font-medium">
                    Certified Organic
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#F6CFA7] rounded-full animate-pulse"></div>
                  <span className="text-white/80 text-xs sm:text-sm font-medium">
                    No Preservatives
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#D8E5D0] rounded-full animate-pulse"></div>
                  <span className="text-white/80 text-xs sm:text-sm font-medium">
                    Gluten Free
                  </span>
                </div>
              </div>
            </div>

            {/* Right Product Image */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Glow Effect Behind Product */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#CDE0B7]/20 to-[#F6CFA7]/20 blur-3xl transform scale-110"></div>

                {/* Product Image */}
                <div className="relative">
                  <img
                    src={heromain3}
                    alt="Devanagari Health Mix Product"
                    className="rounded-2xl shadow-2xl max-w-full h-auto transform hover:scale-105 transition-transform duration-500"
                  />

                  {/* Floating Elements */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex flex-col items-center space-y-2 animate-bounce">
            <span className="text-white/60 text-sm font-medium">
              Scroll to explore
            </span>
            <div className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent"></div>
            <svg
              className="w-5 h-5 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* The Devanagari Difference Section - Enhanced */}
      <section className="py-32 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#CDE0B7]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F6CFA7]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#4A5C3D]/10 backdrop-blur-sm border border-[#4A5C3D]/20 mb-6">
              <span className="text-[#4A5C3D] text-sm font-medium tracking-wide">
                FROM NATURE TO NUTRITION
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#4A5C3D] mb-6 leading-tight">
              A Natural Choice,
              <br />
              <span className="bg-gradient-to-r from-[#4A5C3D] to-[#6B8E23] bg-clip-text text-transparent">
                From Nature to You
              </span>
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-[#CDE0B7] to-[#F6CFA7] rounded-full mx-auto mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Experience the journey of our mix — from grains to glass — with
              care, tradition, and purity in every step.
            </p>
          </div>

          {/* Enhanced Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            {[
              {
                image: millets,
                title: "Heirloom Grains & Millets",
                description:
                  "We source the finest, high-quality ingredients, chosen for their purity and nutritional power.",
                badge: "Premium Quality",
              },
              {
                image: grinding,
                title: "Artisanal Blending Process",
                description:
                  "Our ingredients are carefully blended in small batches to preserve their natural goodness and potency.",
                badge: "Small Batch",
              },
              {
                image: finepowder,
                title: "Finely Milled for Purity",
                description:
                  "The result is a smooth, delicious, and easy-to-mix powder, ready to nourish your day.",
                badge: "Perfect Texture",
              },
            ].map((card, index) => (
              <div key={index} className="group relative">
                {/* Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 border border-gray-100">
                  {/* Badge */}
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4A5C3D]/10 text-[#4A5C3D] text-xs font-medium mb-6">
                    {card.badge}
                  </div>

                  {/* Image */}
                  <div className="relative mb-8 overflow-hidden rounded-2xl">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-[#4A5C3D] leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {card.description}
                    </p>
                  </div>

                  {/* Decorative element */}
                  <div className="absolute top-8 right-8 w-2 h-2 bg-[#CDE0B7] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Benefits Section */}
      <section className="py-32 bg-gradient-to-br from-[#4A5C3D] to-[#5d7249] relative overflow-hidden">
        {/* Background Pattern */}
        {/* <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-white rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 border border-white rounded-full"></div>
          <div className="absolute top-3/4 left-3/4 w-32 h-32 border border-white rounded-full"></div>
        </div> */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-white/90 text-sm font-medium tracking-wide">
                POWERFUL BENEFITS
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Pure Ingredients.
              <br />
              <span className="text-[#CDE0B7]">Powerful Benefits.</span>
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-[#CDE0B7] to-[#F6CFA7] rounded-full mx-auto"></div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="group text-center space-y-6">
                  {/* Icon Container */}
                  <div className="relative">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto group-hover:bg-white/20 transition-all duration-300 border border-white/20">
                      <IconComponent className="text-white" size={36} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {benefit.title}
                    </h3>
                    <p className="text-white/80 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <button className="group bg-white text-[#4A5C3D] px-10 py-5 rounded-2xl text-xl font-bold hover:bg-gray-100 transition-all duration-300 flex items-center space-x-3 shadow-2xl hover:shadow-3xl transform hover:scale-105 mx-auto">
              <span className="font-bold tracking-wide">
                <Link to="/shop">Experience the Benefits</Link>
              </span>
              <ArrowRight
                size={24}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
