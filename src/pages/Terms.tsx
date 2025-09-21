import React from "react";
import { ArrowLeft, FileText, Scale } from "lucide-react";
import { Link } from "react-router-dom";

const Terms = () => {
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
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#4A5C3D]">
                Terms and Conditions
              </h1>
              <p className="text-gray-600 mt-2">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          <div className="border-l-4 border-[#4A5C3D] pl-6">
            <p className="text-gray-700 leading-relaxed">
              Welcome to <strong>SREE SHIVANI FOODS</strong>. By accessing or
              using our website,{" "}
              <a
                href="https://www.sreeshivanifoods.com"
                className="text-[#4A5C3D] hover:underline font-semibold"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.sreeshivanifoods.com
              </a>
              , you agree to comply with and be bound by the following Terms and
              Conditions. Please read them carefully before using our Website or
              purchasing our products.
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4 flex items-center">
              <Scale className="mr-3" size={24} />
              1. General Information
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We are a food manufacturing and distribution company based in{" "}
                <strong>DAVANAGERE</strong>.
              </p>
              <p>
                All products displayed on this Website are manufactured, packed,
                and distributed in accordance with applicable Food Safety and
                Standards Authority of India (FSSAI) guidelines and other
                relevant regulations.
              </p>
              <p>
                By using this Website, you confirm that you are at least 18
                years old or accessing under the supervision of a
                parent/guardian.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              2. Use of Website
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>You agree to use this Website only for lawful purposes.</p>
              <p>
                You may not misuse the Website by introducing viruses, trojans,
                or any malicious technology.
              </p>
              <p>
                Unauthorized use of this Website may give rise to legal claims
                and/or be a criminal offense.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              3. Product Information & Disclaimer
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We make every effort to provide accurate product descriptions,
                images, nutritional details, and ingredients. However, minor
                variations may occur.
              </p>
              <p>
                Our food products may contain or be processed in facilities
                handling nuts, gluten, dairy, soy, or other allergens. Customers
                are responsible for reviewing ingredient lists before
                consumption.
              </p>
              <div className="bg-[#FFF3CD] border border-[#FFEAA7] rounded-lg p-4">
                <p className="font-semibold text-[#856404] mb-2">
                  Important Storage Notice:
                </p>
                <p className="text-[#856404]">
                  The respective shelf life offered is only valid if the product
                  is kept in airtight containers as suggested.{" "}
                  <strong>
                    WE DO NOT ASSURE THE SAME SHELF LIFE IF THE PRODUCT IS
                    EXPOSED TO MOISTURE AND NOT STORED IN THE SUGGESTED
                    CONDITIONS.
                  </strong>
                </p>
              </div>
              <p>
                We do not guarantee that the products will meet your specific
                dietary requirements unless explicitly stated.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              4. Orders, Pricing & Payments
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                All prices displayed are in <strong>INR</strong> and subject to
                change without prior notice.
              </p>
              <p>
                Orders are considered confirmed only after successful payment
                and acknowledgment from us.
              </p>
              <p>
                We reserve the right to refuse, cancel, or limit orders at our
                discretion (e.g., due to incorrect pricing, product
                unavailability, or suspected fraudulent activity).
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              5. Shipping & Delivery
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Delivery timelines mentioned on the Website are estimates and
                may vary due to factors beyond our control.
              </p>
              <p>
                Risk of loss and title for products pass to the customer upon
                delivery.
              </p>
              <p>
                We are not liable for delays, damages, or losses caused by
                courier/logistics providers.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              6. Returns & Refunds
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Due to the perishable nature of our products, returns are
                generally not accepted unless:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The product is damaged during delivery,</li>
                <li>The product delivered is incorrect, or</li>
                <li>The product is expired at the time of delivery.</li>
              </ul>
              <div className="bg-[#E8F5E8] border border-[#C3E6C3] rounded-lg p-4">
                <p className="font-semibold text-[#2D5A2D] mb-2">
                  Return/Refund Process:
                </p>
                <p className="text-[#2D5A2D]">
                  For returns or refunds, one has to send a detailed description
                  mentioning order details and valid reason for return or refund
                  to our email or WhatsApp.{" "}
                  <strong>
                    EXCHANGE will be offered in the first case, and will be
                    refunded ONLY IF THE PRODUCT IS UNAVAILABLE at the moment.
                  </strong>
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              7. Intellectual Property
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                All content on this Website, including but not limited to text,
                logos, product images, recipes, graphics, and design, is the
                property of <strong>SREE SHIVANI FOODS</strong> and protected
                under applicable copyright and trademark laws.
              </p>
              <p>
                You may not reproduce, distribute, or use any content from this
                Website without prior written consent.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              8. Limitation of Liability
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                To the maximum extent permitted by law,{" "}
                <strong>SREE SHIVANI FOODS</strong> shall not be held liable
                for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Any direct, indirect, incidental, or consequential damages
                  arising from the use of our products or Website.
                </li>
                <li>
                  Any allergic reactions, health conditions, or adverse effects
                  resulting from the consumption of our products, unless caused
                  by proven negligence on our part.
                </li>
              </ul>
              <p>
                <strong>
                  Customers are solely responsible for ensuring that products
                  are suitable for their consumption.
                </strong>
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              9. Privacy & Data Protection
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We respect your privacy. Information collected on this Website
                (such as name, contact details, and payment information) is used
                only for processing orders and improving services.
              </p>
              <p>
                We will not share or sell your personal data to third parties,
                except where required by law or necessary for order fulfillment
                (e.g., logistics partners).
              </p>
              <p>For more details, refer to our Privacy Policy.</p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              10. Governing Law & Jurisdiction
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of India.
              </p>
              <p>
                Any disputes shall be subject to the exclusive jurisdiction of
                the courts at Karnataka.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-[#4A5C3D] mb-4">
              11. Modifications
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We reserve the right to amend these Terms at any time without
                prior notice.
              </p>
              <p>
                Continued use of the Website after changes constitutes
                acceptance of the revised Terms.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <div className="bg-[#E6D9C5] rounded-lg p-6 mt-8">
            <h3 className="text-xl font-bold text-[#4A5C3D] mb-4">
              Contact Us
            </h3>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms and Conditions, please
              contact us:
            </p>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Email:</strong> sreeshivanifoods@gamil.com
              </p>
              <p>
                <strong>Phone:</strong> 9964560622
              </p>
              <p>
                <strong>Address:</strong> #5187/A-22, Banashankari Badavane,
                Davangere-577004, Karnataka
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
