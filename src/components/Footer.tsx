import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#4A5C3D] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Devanagari</h3>
            <p className="text-gray-300">
              Wellness, rooted in tradition. Fueling your health with nature's
              finest ingredients.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <div className="space-y-2">
              <Link
                to="/"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                to="/shop"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Shop
              </Link>
              <Link
                to="/about"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                About Us
              </Link>
              <div className="flex items-center space-x-3">
                <Link
                  to="/contact"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact
                </Link>
                <div className="flex items-center space-x-3">
                  <a
                    href="https://www.facebook.com/profile.php?id=61580180758661"
                    className="text-gray-300 hover:text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook size={24} />
                  </a>
                  <a
                    href="https://www.instagram.com/sreeshivanifoods?igsh=M3JsbzB1bXdtcXNy"
                    className="text-gray-300 hover:text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={24} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Care */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Customer Care</h4>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                FAQ
              </a>
              <Link
                to="/terms"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Terms and Conditions
              </Link>

              <Link
                to="/privacy"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact Info</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail size={16} />
                <span className="text-gray-300">
                  sreeshivanifoods@gamil.com
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone size={16} />
                <span className="text-gray-300">9964560622</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin size={30} />
                <span className="text-gray-300">
                  #5187/A-22, Banashankari Badavane Davangere-577004, Karnataka
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 text-center">
          <p className="text-gray-300">
            © 2025 Devanagari Health Mix. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
