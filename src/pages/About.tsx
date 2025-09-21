import { motion } from "framer-motion";
import companyHero from "../assets/company-hero.jpg";

export default function About() {
  return (
    <div className="bg-[#FDFBF8] text-gray-800">
      {/* Hero Section */}
      <section
        className="relative h-[70vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${companyHero})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <motion.h1
          className="relative z-10 text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center px-4"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Know About Us More
        </motion.h1>
      </section>

      {/* Vision & Mission */}
      <section className="py-12 sm:py-16 lg:py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 text-center">
          {[
            {
              title: "Our Vision",
              text: "We believe that true wellness begins with what we eat. Our malt powder is crafted to nourish the body and soul...",
            },
            {
              title: "Our Mission",
              text: "Our mission is to empower well-being through nutrient-rich, food-first nourishment that honors the body's wisdom...",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-white shadow-lg p-6 sm:p-8 rounded-2xl"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
            >
              <h2 className="text-2xl sm:text-3xl font-semibold mb-3 sm:mb-4 text-[#4A5C3D]">
                {item.title}
              </h2>
              <p className="text-base sm:text-lg leading-relaxed">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        className="bg-gray-100 py-10 text-center text-sm text-gray-600"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <p>Manufactured by: Sree Shivani Foods</p>
        <p>FSSAI No: 11225313000263 | ISO Certified</p>
        <p>#5187/A-22, Banashankari Badavane Davangere-577004, Karnataka</p>
        <p className="mt-4">
          © 2025 Devanagari Health Mix. All rights reserved.
        </p>
      </motion.footer>
    </div>
  );
}
