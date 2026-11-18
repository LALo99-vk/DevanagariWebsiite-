import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Instagram } from "lucide-react";

const linkClass =
  "block w-fit text-[15px] text-mist transition-colors hover:text-gold-300";

const headingClass = "font-display text-xl text-gold-300";

const Footer = () => {
  return (
    <footer className="bg-emerald-900 border-t border-gold-400/20 text-cream">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4 space-y-5">
            <h3 className="sr-only">Devanagari</h3>
            <p className="max-w-xs text-[15px] leading-[1.7] text-mist">
              Wellness, rooted in tradition. Fueling your health with nature's
              finest ingredients.
            </p>
            <div className="flex gap-2">
              <a
                href="https://www.facebook.com/profile.php?id=61580180758661"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-full border border-gold-400/30 text-gold-300 transition-colors hover:border-gold-300 hover:text-gold-200"
              >
                <Facebook size={17} strokeWidth={1.6} />
              </a>
              <a
                href="https://www.instagram.com/sreeshivanifoods?igsh=M3JsbzB1bXdtcXNy"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full border border-gold-400/30 text-gold-300 transition-colors hover:border-gold-300 hover:text-gold-200"
              >
                <Instagram size={17} strokeWidth={1.6} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className={headingClass}>Quick Links</h4>
            <div className="space-y-2.5">
              <Link to="/" className={linkClass}>Home</Link>
              <Link to="/shop" className={linkClass}>Shop</Link>
              <Link to="/about" className={linkClass}>About Us</Link>
              <Link to="/contact" className={linkClass}>Contact</Link>
            </div>
          </div>

          {/* Customer Care */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className={headingClass}>Customer Care</h4>
            <div className="space-y-2.5">
              <a href="#" className={linkClass}>FAQ</a>
              <Link to="/terms" className={linkClass}>Terms and Conditions</Link>
              <Link to="/privacy" className={linkClass}>Privacy Policy</Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className={headingClass}>Contact Info</h4>
            <div className="space-y-3 text-[15px]">
              <a
                href="mailto:sreeshivanifoods@gmail.com"
                className="flex items-center gap-3 text-mist transition-colors hover:text-gold-300"
              >
                <Mail size={16} strokeWidth={1.6} className="shrink-0 text-gold-400" />
                sreeshivanifoods@gmail.com
              </a>
              <a
                href="tel:+919964560622"
                className="flex items-center gap-3 text-mist transition-colors hover:text-gold-300"
              >
                <Phone size={16} strokeWidth={1.6} className="shrink-0 text-gold-400" />
                9964560622
              </a>
              <div className="flex items-start gap-3 text-mist">
                <MapPin size={16} strokeWidth={1.6} className="mt-1 shrink-0 text-gold-400" />
                <span>#5187/A-22, Banashankari Badavane Davangere-577004, Karnataka</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-gold-400/15 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] text-mist">
          <p>© 2025 Devanagari Health Mix. All rights reserved.</p>
          <p>Manufactured by: Sree Shivani Foods</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
