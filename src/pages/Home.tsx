import { Link } from "react-router-dom";
import {
  Leaf,
  Shield,
  Bone,
  Wheat,
  ArrowRight,
  Check,
} from "lucide-react";
import type { CSSProperties } from "react";
import millets from "../assets/millet.png";
import grinding from "../assets/grinding1.png";
import finepowder from "../assets/powderMix.png .png";
import grainPhoto from "../assets/hero-grain.webp";
import grainPhotoMobile from "../assets/hero-grain-mobile.webp";
import { CountUp, IngredientHoneycomb } from "../components/IngredientHoneycomb";
import { SectionRangoli, useInView } from "../components/Rangoli";

// Staggered delay, read by the CSS transitions as --d
const delay = (seconds: number) => ({ ["--d" as string]: `${seconds}s` }) as CSSProperties;

// The hero wordmark: the grain photo is clipped to this text
const wordProps = {
  x: 670,
  y: 262,
  textAnchor: "middle",
  textLength: 1334,
  lengthAdjust: "spacing",
  fontFamily: "'Source Serif 4', Georgia, serif",
  fontWeight: 800,
  fontSize: 300,
} as const;

const Home = () => {
  const [stepsRef, stepsIn] = useInView<HTMLOListElement>();
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

  const journey = [
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
  ];


  return (
    <div className="bg-emerald-950 text-cream">
      {/* ───────────── Hero: the name, made of grain ───────────── */}
      <section className="relative pt-24">
        <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-14 flex flex-col pt-14 pb-16 sm:pt-20 sm:pb-20 lg:min-h-[calc(100svh-6rem)] lg:justify-center lg:py-10">
          <h1>
            <span className="sr-only">Devanagari</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 1340 345"
              className="block h-auto w-full"
            >
              <defs>
                <clipPath id="hero-word">
                  <text {...wordProps}>Devanagari</text>
                </clipPath>
              </defs>
              {/* phones get a tighter crop, so the brightest grain sits under the small word */}
              <image
                href={grainPhotoMobile}
                className="sm:hidden"
                x="0"
                y="0"
                width="1340"
                height="345"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#hero-word)"
              />
              <image
                href={grainPhoto}
                className="hidden sm:inline"
                x="0"
                y="0"
                width="1340"
                height="345"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#hero-word)"
              />
            </svg>
          </h1>

          <p className="mt-3 text-right font-display font-semibold text-lg sm:mt-2 sm:text-2xl text-gold-400">
            by Sree Shivani Foods, Davangere
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col gap-8 border-t border-gold-400/45 pt-8 sm:pt-10 md:flex-row md:items-center md:justify-between">
            <p className="max-w-[46rem] font-display font-medium text-[26px] leading-[1.22] sm:text-[34px] text-cream">
              Grains, millets and spices,{" "}
              <span className="text-gold-400">ground in small batches</span>{" "}
              for every family.
            </p>
            <Link
              to="/shop"
              className="btn-gold group !px-8 !py-4 !text-base justify-center self-stretch sm:self-start md:self-auto"
            >
              Shop now
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── From nature to you ───────────── */}
      <section className="relative overflow-hidden border-t border-gold-400/15">
        <SectionRangoli className="-left-44 top-10 h-[26rem] w-[26rem] hidden md:block" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-24 lg:py-32">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 className="font-display lg:col-span-6 text-4xl sm:text-5xl leading-[1.08]">
              A Natural Choice,
              <br />
              <span className="italic text-gold-400">From Nature to You</span>
            </h2>
            <p className="lg:col-span-5 lg:col-start-8 text-[17px] leading-[1.7] text-mist">
              Experience the journey of our mix — from grains to glass — with
              care, tradition, and purity in every step.
            </p>
          </div>

          <ol ref={stepsRef} className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
            {journey.map((step, i) => (
              <li key={step.title} className="group">
                <div
                  data-reveal-clip={stepsIn}
                  style={delay(i * 0.12)}
                  className="overflow-hidden rounded-xl aspect-[4/3] bg-emerald-900"
                >
                  <img
                    src={step.image}
                    alt={step.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="font-display mt-6 text-2xl text-cream">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-mist">
                  {step.description}
                </p>
                <p className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-gold-300">
                  <Check size={14} strokeWidth={2} />
                  {step.badge}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── What's inside: the 21 ingredients ───────────── */}
      <section className="relative overflow-hidden bg-emerald-900 border-y border-gold-400/15">
        <SectionRangoli className="-right-52 -bottom-52 h-[34rem] w-[34rem]" />
        <SectionRangoli className="-left-60 -top-60 h-[30rem] w-[30rem] hidden lg:block" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-24 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end mb-14 lg:mb-16">
            <h2 className="font-display font-light lg:col-span-6 text-4xl sm:text-5xl leading-[1.08]">
              <CountUp to={21} className="italic text-gold-400" /> Natural Ingredients
            </h2>
            <p className="lg:col-span-5 lg:col-start-8 text-[17px] leading-[1.7] text-mist">
              Carefully selected grains, millets, and pulses for complete
              nutrition
            </p>
          </div>

          <IngredientHoneycomb />
        </div>
      </section>

      {/* ───────────── Benefits ───────────── */}
      <section>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 lg:py-32 grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-4xl sm:text-5xl leading-[1.08]">
              Pure Ingredients.
              <br />
              <span className="italic text-gold-400">Powerful Benefits.</span>
            </h2>
            <Link to="/shop" className="btn-outline-gold group mt-10">
              Experience the Benefits
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <ul className="lg:col-span-7 border-t border-gold-400/25">
            {benefits.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-gold-400/15 py-7"
              >
                <Icon size={24} strokeWidth={1.5} className="mt-1 text-gold-400" />
                <div>
                  <h3 className="font-display text-2xl text-cream">{title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-mist">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Home;
