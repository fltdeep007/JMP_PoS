import { Phone, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import jmpLogo from "@/assets/jmp-logo.png";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <img src={jmpLogo} alt="JMP - शुद्धता का वादा" className="h-16 w-auto" />
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#products" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Products
          </a>
          <a href="#about" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            About Us
          </a>
          <a href="#contact" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors sm:px-4"
          >
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Login</span>
          </Link>

          <a
            href="tel:+916375526458"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Call Us</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
