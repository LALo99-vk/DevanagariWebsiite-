import { Link } from "react-router-dom";
import {
  ShoppingBag,
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
import productShot from "../assets/heromain4.png";
import { CountUp, IngredientHoneycomb } from "../components/IngredientHoneycomb";
import { Rangoli, SectionRangoli, StarMark, useInView } from "../components/Rangoli";

// Staggered delay, read by the CSS transitions as --d
const delay = (seconds: number) => ({ ["--d" as string]: `${seconds}s` }) as CSSProperties;
const rise = (step: number) => ({ animationDelay: `${0.45 + step * 0.08}s` });

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
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden pt-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 grid lg:grid-cols-12 items-center gap-10 lg:gap-6 lg:min-h-[calc(100svh-6rem)] py-14 lg:py-16">
          {/* Copy */}
          <div className="lg:col-span-6 relative z-10">
            <h1 className="font-display font-light text-[3rem] leading-[1.0] sm:text-6xl xl:text-[5.5rem] tracking-[-0.025em] text-cream">
              <span className="line-mask"><span style={delay(0.1)}>Wellness,</span></span>
              <span className="line-mask">
                <span style={delay(0.2)}>
                  <span className="ink-underline italic text-gold-400" style={delay(1)}>Rooted in</span>
                </span>
              </span>
              <span className="line-mask"><span style={delay(0.3)}>Tradition</span></span>
            </h1>

            <p
              className="animate-rise mt-8 flex items-center gap-4 text-sm font-semibold tracking-[0.12em] text-gold-300"
              style={rise(0)}
            >
              <StarMark className="h-3.5 w-3.5 text-gold-400" />
              FUELS HEALTH. POWERS LIFE.
            </p>

            <p
              className="animate-rise mt-5 max-w-[34rem] text-[17px] leading-[1.7] text-mist"
              style={rise(1)}
            >
              Discover the power of{" "}
              <span className="font-semibold text-cream">21 natural grains</span>,
              millets, and pulses in a single, nourishing mix. Inspired by nature
              and rooted in tradition, Devanagari Health Mix is your gateway to
              vibrant wellness.
            </p>

            <div
              className="animate-rise mt-10 flex flex-col sm:flex-row sm:items-center gap-6"
              style={rise(2)}
            >
              <Link to="/shop" className="btn-gold group !px-7 !py-3.5 !text-[15px] self-start">
                <ShoppingBag size={18} strokeWidth={1.8} />
                Shop Now
                <ArrowRight
                  size={16}
                  className="-ml-0.5 transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-mist">
                {["Certified Organic", "No Preservatives", "Gluten Free"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <StarMark className="h-2.5 w-2.5 text-gold-400" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The pack at the centre of a rangoli */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative aspect-square w-[min(92vw,620px)]">
              <Rangoli spin className="absolute inset-0 h-full w-full text-gold-400/60" />
              <div className="absolute inset-[18%] overflow-hidden rounded-full border border-gold-400/70 bg-emerald-900">
                <img
                  src={productShot}
                  alt="Devanagari Health Mix Product"
                  className="settle h-full w-full object-cover object-[62%_55%] scale-[1.0]"
                />
              </div>
            </div>
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
