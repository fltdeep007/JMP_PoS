import Header from "@/components/Header";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-muted-foreground">
          <section>
            <p className="text-sm mb-4">Last updated: {new Date().toLocaleDateString()}</p>
            <p>
              Welcome to JMP Dairy. By accessing our website or using our services, you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using JMP Dairy's website and services, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. Products and Services</h2>
            <p className="mb-3">JMP Dairy offers fresh dairy products including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fresh Milk</li>
              <li>Paneer (Cottage Cheese)</li>
              <li>Ghee (Clarified Butter)</li>
              <li>Traditional Sweets</li>
              <li>Mava (Khoya)</li>
              <li>Makkhan (Butter)</li>
              <li>Lassi (Sweet and Salted)</li>
            </ul>
            <p className="mt-3">
              All products are subject to availability. We reserve the right to modify, discontinue, or change pricing for any product without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. Orders and Payments</h2>
            <p className="mb-3">When placing an order:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information</li>
              <li>Orders are confirmed subject to product availability</li>
              <li>Payment terms will be communicated at the time of order</li>
              <li>We reserve the right to refuse or cancel any order</li>
              <li>Prices are subject to change without notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. Delivery</h2>
            <p>
              We strive to deliver products fresh and on time. Delivery times are estimates and may vary. We are not liable for delays caused by circumstances beyond our control. Delivery areas and charges will be communicated at the time of order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. Product Quality and Returns</h2>
            <p className="mb-3">
              We are committed to providing fresh, high-quality dairy products. If you receive a defective or unsatisfactory product:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact us immediately at support@jmpmilk.store or +91-6375526458</li>
              <li>Returns or replacements must be reported within 24 hours of delivery</li>
              <li>Products must be in their original condition</li>
              <li>We reserve the right to inspect returned products</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Communication via WhatsApp</h2>
            <p>
              By contacting us via WhatsApp, you consent to receive communications from JMP Dairy through WhatsApp Business API. This may include order confirmations, updates, promotional messages, and customer service communications. You can opt-out at any time by sending a message requesting to stop communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p>
              All content on this website, including text, images, logos, and trademarks, is the property of JMP Dairy and protected by intellectual property laws. You may not use, reproduce, or distribute any content without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>
              JMP Dairy shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our products or services. Our total liability shall not exceed the amount paid for the product or service in question.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">9. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide false or misleading information</li>
              <li>Use our services for any unlawful purpose</li>
              <li>Interfere with the proper functioning of our website</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Harass or abuse our staff or other customers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">10. Privacy</h2>
            <p>
              Your use of our services is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices regarding your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">11. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in the applicable jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">13. Contact Information</h2>
            <p className="mb-3">For questions or concerns about these Terms of Service, please contact us:</p>
            <ul className="space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@jmpmilk.store" className="text-primary hover:underline">support@jmpmilk.store</a></li>
              <li><strong>Phone:</strong> <a href="tel:+916375526458" className="text-primary hover:underline">+91-6375526458</a></li>
              <li><strong>WhatsApp:</strong> <a href="https://wa.me/916375526458" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+91-6375526458</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">14. Severability</h2>
            <p>
              If any provision of these Terms of Service is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
