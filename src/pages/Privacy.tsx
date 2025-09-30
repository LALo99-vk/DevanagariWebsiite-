import React from "react";
import { ArrowLeft, Shield, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy: React.FC = () => {
  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="px-4 py-12 mx-auto max-w-4xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/contact"
            className="inline-flex items-center text-[#4A5C3D] hover:text-[#3a4a2f] transition-colors mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Contact
          </Link>

          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-[#4A5C3D] rounded-full flex items-center justify-center mr-4">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#4A5C3D]">
                Privacy Policy
              </h1>
              <p className="text-gray-600 mt-2">Last updated: 24/08/2025</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          <div className="border-l-4 border-[#4A5C3D] pl-6">
            <p className="text-gray-700 leading-relaxed">
              At <strong>Devanagari</strong> (operated by Sree Shivani Foods, a
              sole proprietorship firm based in Davangere, Karnataka, India), we
              value and respect your privacy. This Privacy Policy explains how
              we collect, use, and protect your personal information when you
              visit and use our website{" "}
              <a
                href="https://www.sreeshivanifoods.com"
                className="text-[#4A5C3D] hover:underline font-semibold"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.sreeshivanifoods.com
              </a>
              . By accessing or using our Website, you agree to the terms of
              this Privacy Policy.
            </p>
            <p className="text-sm text-gray-500 mt-3 flex items-center">
              <FileText size={16} className="mr-2" />
              Effective Date: 24/08/2025
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>When you interact with our Website, we may collect:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Personal Information:</strong> Name, email address,
                  phone number, billing/shipping address, and payment details
                  when you place an order.
                </li>
                <li>
                  <strong>Non-Personal Information:</strong> Browser type,
                  device information, IP address, and website usage data
                  (through cookies and analytics tools).
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              2. How We Use Your Information
            </h2>
            <div className="space-y-2 text-gray-700">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Processing and delivering your orders.</li>
                <li>
                  Communicating with you regarding your purchases, inquiries, or
                  promotions.
                </li>
                <li>
                  Improving our Website, products, and customer experience.
                </li>
                <li>
                  Sending marketing or promotional messages (only if you
                  opt-in).
                </li>
                <li>
                  Ensuring legal compliance and preventing fraudulent
                  activities.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              3. Sharing of Information
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We do not sell, rent, or trade your personal information to
                third parties. However, we may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Service Providers:</strong> Delivery partners, payment
                  gateways, and IT service providers to fulfill your orders.
                </li>
                <li>
                  <strong>Legal Authorities:</strong> When required by law,
                  regulation, or legal process.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              4. Cookies & Tracking
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Our Website may use cookies and similar technologies to enhance
                user experience, analyze traffic, and provide personalized
                recommendations. You can control cookie preferences through your
                browser settings.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              5. Data Security
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We take reasonable technical and organizational measures to
                protect your personal information against unauthorized access,
                loss, misuse, or alteration. However, no method of transmission
                over the internet is completely secure.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              6. Your Rights
            </h2>
            <div className="space-y-2 text-gray-700">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Access and review the personal information we hold about you.
                </li>
                <li>Request corrections or updates to your information.</li>
                <li>
                  Opt-out of receiving promotional emails or marketing
                  communication.
                </li>
                <li>
                  Request deletion of your data, subject to legal or contractual
                  obligations.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              7. Third-Party Links
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Our Website may contain links to third-party websites. We are
                not responsible for the privacy practices or content of such
                external sites.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              8. Children’s Privacy
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Our products and Website are not intended for individuals under
                the age of 18. We do not knowingly collect personal data from
                children.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              9. Changes to This Policy
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We may update this Privacy Policy from time to time. Any changes
                will be posted on this page with an updated “Effective Date.”
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              10. Contact Us
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>For questions, concerns, or requests regarding this policy:</p>
              <div className="bg-[#E6D9C5] rounded-lg p-6 mt-2">
                <p>
                  <strong>Brand:</strong> Devanagari (Sree Shivani Foods)
                </p>
                <p>
                  <strong>Location:</strong> Davangere, Karnataka, India
                </p>
                <p>
                  <strong>Email:</strong> sreeshivanifoods@gmail.com
                </p>
                <p>
                  <strong>Phone:</strong> 9964560622
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
