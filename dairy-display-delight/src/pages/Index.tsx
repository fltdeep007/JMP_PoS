import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

import milkImage from "@/assets/products/milk.jpg";
import paneerImage from "@/assets/products/paneer.jpg";
import gheeImage from "@/assets/products/ghee.jpg";
import sweetsImage from "@/assets/products/sweets.jpg";
import mavaImage from "@/assets/products/mava.jpg";
import makkhanImage from "@/assets/products/makkhan.jpg";
import sweetLassiImage from "@/assets/products/sweet-lassi.jpg";
import saltedLassiImage from "@/assets/products/salted-lassi.jpg";

const products = [
  {
    name: "Fresh Milk",
    image: milkImage,
    description: "Pure, fresh, and nutritious milk delivered daily",
  },
  {
    name: "Paneer",
    image: paneerImage,
    description: "Soft and fresh cottage cheese made from pure milk",
  },
  {
    name: "Ghee",
    image: gheeImage,
    description: "Pure clarified butter with authentic taste and aroma",
  },
  {
    name: "Sweets",
    image: sweetsImage,
    description: "Traditional milk-based sweets made with love",
  },
  {
    name: "Mava",
    image: mavaImage,
    description: "Premium quality khoya for all your cooking needs",
  },
  {
    name: "Makkhan",
    image: makkhanImage,
    description: "Fresh homemade butter, rich and creamy",
  },
  {
    name: "Sweet Lassi",
    image: sweetLassiImage,
    description: "Refreshing sweet yogurt drink, perfect for any time",
  },
  {
    name: "Salted Lassi",
    image: saltedLassiImage,
    description: "Traditional salted lassi with aromatic spices",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-6xl">
            शुद्धता का वादा
          </h1>
          <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
            Premium Quality Dairy Products
          </p>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
            Experience the purity and freshness of traditional dairy products. 
            From farm to table, we ensure the highest quality in every product.
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
            Our Products
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.name}
                name={product.name}
                image={product.image}
                description={product.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
              About JMP Dairy
            </h2>
            <p className="mb-4 text-base text-muted-foreground md:text-lg">
              At JMP, we are committed to delivering the purest and freshest dairy products. 
              Our promise of purity (शुद्धता का वादा) is reflected in every product we make.
            </p>
            <p className="text-base text-muted-foreground md:text-lg">
              With traditional methods and modern standards, we ensure that our dairy products 
              maintain their authentic taste while meeting the highest quality standards.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
            Contact Us
          </h2>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Phone</h3>
              <a href="tel:+916375526458" className="text-muted-foreground hover:text-primary">
                +91-6375526458
              </a>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">WhatsApp</h3>
              <a 
                href="https://wa.me/916375526458"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                Chat with us
              </a>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Location</h3>
              <p className="text-muted-foreground">Serving Fresh Daily</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 JMP Dairy. All rights reserved. शुद्धता का वादा
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">
              Privacy Policy
            </a>
            <a href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
};

export default Index;
