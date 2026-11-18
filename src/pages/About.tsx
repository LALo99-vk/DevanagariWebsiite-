import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Mail, Phone, ShoppingBag } from "lucide-react";
import { ingredients } from "../data/ingredients";
import { useInView } from "../components/Rangoli";

const delay = (seconds: number) => ({ ["--d" as string]: `${seconds}s` }) as CSSProperties;

/**
 * The About page, read like the information panel on the back of the pouch.
 */
export default function About() {
  const [panelRef, printed] = useInView<HTMLDListElement>("0px");

  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "Product",
      value: (
        <div>
          <span className="font-display font-light text-[1.75rem] leading-tight text-cream">
            Devanagari Health Mix
          </span>
          <p className="mt-1 text-[13px] font-semibold tracking-[0.06em] text-gold-300">
            HIGH PROTEIN MALT POWDER
          </p>
        </div>
      ),
    },
    {
      label: "Ingredients",
      value: (
        <div>
          <p className="flex items-baseline gap-3">
            <span className="font-display font-light text-[3.5rem] leading-none text-gold-400 tabular-nums">
              21
            </span>
            <span className="font-display font-light text-[1.4rem] text-cream">
              Natural Ingredients
            </span>
          </p>
          <p className="mt-3 text-[15px] leading-[1.9] text-cream">
          {ingredients.map((item, i) => (
            <span key={item.name}>
              <span className="transition-colors duration-200 hover:text-gold-300">
                {item.name}
              </span>
              {i < ingredients.length - 1 ? ", " : "."}
            </span>
          ))}
          </p>
        </div>
      ),
    },
    {
      // the claims printed on the pack, word for word
      label: "Goodness",
      value: (
        <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 text-[15px] text-cream">
          {[
            "22g Protein in 100g",
            "No added preservatives",
            "No artificial flavours",
            "Zero sugar",
            "Zero cholesterol",
            "Zero trans fat",
            "Suitable for all ages",
          ].map((claim) => (
            <li key={claim} className="flex items-center gap-2.5">
              <Check size={15} strokeWidth={2.2} className="shrink-0 text-gold-400" />
              {claim}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Our Vision",
      value: (
        <p className="font-display font-light max-w-[60ch] text-[1.3rem] leading-[1.55] text-cream">
          We believe that true wellness begins with what we eat. Our malt powder
          is crafted to nourish the body and soul...
        </p>
      ),
    },
    {
      label: "Our Mission",
      value: (
        <p className="font-display font-light max-w-[60ch] text-[1.3rem] leading-[1.55] text-cream">
          Our mission is to empower well-being through nutrient-rich, food-first
          nourishment that honors the body's wisdom...
        </p>
      ),
    },
    {
      label: "Manufactured by",
      value: (
        <div>
          <p className="font-display text-[1.4rem] text-cream">Sree Shivani Foods</p>
          <p className="mt-1 text-[15px] text-gold-300">
            Davangere's own Domestic brand · Traditional Recipe · Small Batch
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-mist">
            #5187/A-22, Banashankari Badavane Davangere-577004, Karnataka
          </p>
        </div>
      ),
    },
    {
      label: "Certified",
      value: (
        <div className="flex flex-wrap gap-3">
          <span className="rounded-lg border border-gold-400/70 px-3 py-1.5 text-[14px] font-semibold text-gold-200">
            FSSAI No: <span className="tabular-nums">11225313000263</span>
          </span>
          <span className="rounded-lg border border-gold-400/70 px-3 py-1.5 text-[14px] font-semibold text-gold-200">
            ISO Certified
          </span>
        </div>
      ),
    },
    {
      label: "Contact",
      value: (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 text-[15px]">
          <a
            href="tel:+919964560622"
            className="inline-flex items-center gap-2.5 text-cream underline decoration-gold-400/30 hover:text-gold-300 hover:decoration-gold-300 transition-colors"
          >
            <Phone size={16} strokeWidth={1.6} className="text-gold-400" />
            <span className="tabular-nums">9964560622</span>
          </a>
          <a
            href="mailto:sreeshivanifoods@gmail.com"
            className="inline-flex items-center gap-2.5 text-cream underline decoration-gold-400/30 hover:text-gold-300 hover:decoration-gold-300 transition-colors"
          >
            <Mail size={16} strokeWidth={1.6} className="text-gold-400" />
            sreeshivanifoods@gmail.com
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-emerald-950 text-cream">
      <section className="pt-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 lg:py-20 grid gap-10 lg:gap-14 lg:grid-cols-[22rem_1fr] lg:items-start">
          {/* Heading and actions */}
          <div>
            <h1 className="font-display font-light animate-rise text-5xl sm:text-6xl lg:text-[4.25rem] leading-[1.02] tracking-[-0.025em]">
              Know About <span className="italic text-gold-400">Us More</span>
            </h1>
            <p
              className="animate-rise mt-6 max-w-[22rem] text-[17px] leading-[1.6] text-mist"
              style={{ animationDelay: "0.06s" }}
            >
              Read us the way you read the back of our pack.
            </p>
            <div
              className="animate-rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
              style={{ animationDelay: "0.12s" }}
            >
              <Link to="/shop" className="btn-gold group !px-7 !py-3.5 !text-[15px]">
                <ShoppingBag size={17} strokeWidth={1.8} />
                Shop Now
              </Link>
              <Link to="/contact" className="link-gold group">
                Get in Touch
                <ArrowRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>

          {/* The pack's information panel */}
          <dl
            ref={panelRef}
            className="overflow-hidden rounded-[14px] border-2 border-gold-400 bg-emerald-900"
          >
            {rows.map((row, i) => (
              <div
                key={row.label}
                data-printed={printed}
                style={delay(0.1 + i * 0.1)}
                className={`pack-row relative grid sm:grid-cols-[12.5rem_1fr] sm:items-baseline ${
                  i > 0 ? "border-t border-gold-400/35" : ""
                }`}
              >
                <dt
                  data-printed={printed}
                  style={delay(0.1 + i * 0.1)}
                  className="label-cell relative px-5 py-3 sm:py-5 text-[13px] font-bold uppercase tracking-[0.06em] text-emerald-950"
                >
                  {row.label}
                </dt>
                <dd
                  data-reveal={printed}
                  style={delay(0.3 + i * 0.1)}
                  className="px-5 sm:px-7 py-4 sm:py-5"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
