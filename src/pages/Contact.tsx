import React, { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

const Contact = () => {
  const { showSuccess } = useNotification();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    showSuccess(
      "Message Sent",
      "Thank you for your message! We'll get back to you soon."
    );
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-12 text-center sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4A5C3D] mb-3 sm:mb-4">
            Get in Touch
          </h1>
          <p className="max-w-2xl px-4 mx-auto text-lg text-gray-700 sm:text-xl">
            We'd love to hear from you. Reach out with any questions or
            feedback.
          </p>
        </div>

        {/* Contact Details & Form */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 sm:gap-12">
          {/* Left Column - Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#4A5C3D] mb-6 sm:mb-8">
                Contact Information
              </h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start p-4 space-x-3 bg-white shadow-lg sm:space-x-4 sm:p-6 rounded-xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#4A5C3D] rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin
                      className="text-white"
                      size={18}
                      className="sm:w-5 sm:h-5"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#4A5C3D] text-sm sm:text-base">
                      Address
                    </h3>
                    <p className="text-sm text-gray-700 sm:text-base">
                      #5187/A-22, Banashankari Badavane Davangere-577004,
                      Karnataka
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 space-x-3 bg-white shadow-lg sm:space-x-4 sm:p-6 rounded-xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#A88B67] rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail
                      className="text-white"
                      size={18}
                      className="sm:w-5 sm:h-5"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#4A5C3D] text-sm sm:text-base">
                      Email
                    </h3>
                    <p className="text-sm text-gray-700 sm:text-base">
                      sreeshivanifoods@gamil.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 space-x-3 bg-white shadow-lg sm:space-x-4 sm:p-6 rounded-xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#4A5C3D] rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone
                      className="text-white"
                      size={18}
                      className="sm:w-5 sm:h-5"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#4A5C3D] text-sm sm:text-base">
                      Phone
                    </h3>
                    <p className="text-sm text-gray-700 sm:text-base">
                      9964560622
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-[#E6D9C5] p-6 rounded-xl">
              <h3 className="text-xl font-bold text-[#4A5C3D] mb-4">
                Business Hours
              </h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-[#4A5C3D] mb-2"
              >
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent transition-all"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#4A5C3D] mb-2"
              >
                Your Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent transition-all"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-semibold text-[#4A5C3D] mb-2"
              >
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent transition-all"
                placeholder="What's this about?"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-semibold text-[#4A5C3D] mb-2"
              >
                Your Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent transition-all resize-none"
                placeholder="Tell us how we can help you..."
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-[#4A5C3D] text-white py-4 rounded-lg font-semibold 
              hover:bg-[#3a4a2f] transition-colors duration-200 flex items-center justify-center 
              space-x-2 shadow-lg hover:shadow-xl"
            >
              <Send size={20} />
              <span>Send Message</span>
            </button>

            {/* Terms and Conditions Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                By submitting this form, you agree to our{" "}
                <a
                  href="/terms"
                  className="text-[#4A5C3D] hover:text-[#3a4a2f] underline font-medium transition-colors"
                >
                  Terms and Conditions
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Additional Info Section */}
      <section className="py-20 bg-[#E6D9C5]">
        <div className="px-4 mx-auto text-center max-w-7xl sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#4A5C3D] mb-8">
            We're Here to Help
          </h2>
          <p className="max-w-3xl mx-auto mb-8 text-lg text-gray-700">
            Whether you have questions about our ingredients, need help with
            your order, or want to learn more about incorporating Devanagari
            Health Mix into your wellness routine, our team is ready to assist.
          </p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="p-6 bg-white shadow-lg rounded-xl">
              <h3 className="font-bold text-[#4A5C3D] mb-2">
                Product Questions
              </h3>
              <p className="text-gray-600">
                Learn about ingredients and preparation
              </p>
            </div>
            <div className="p-6 bg-white shadow-lg rounded-xl">
              <h3 className="font-bold text-[#4A5C3D] mb-2">Order Support</h3>
              <p className="text-gray-600">Help with orders and shipping</p>
            </div>
            <div className="p-6 bg-white shadow-lg rounded-xl">
              <h3 className="font-bold text-[#4A5C3D] mb-2">
                Wellness Guidance
              </h3>
              <p className="text-gray-600">Tips for your health journey</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
