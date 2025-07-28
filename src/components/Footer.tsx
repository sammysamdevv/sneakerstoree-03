import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">SneakerStore</h3>
            <p className="text-sm text-muted-foreground">
              Your premier destination for authentic sneakers and streetwear. 
              Discover the latest drops and exclusive collections.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold text-sm">S</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Login / Register
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Checkout
                </Link>
              </li>
              <li>
                <a href="#categories" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Categories
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Contact & Support</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail size={16} className="text-primary" />
                <a href="mailto:info@sneakerstore.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  info@sneakerstore.com
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Phone size={16} className="text-primary" />
                <a href="tel:0707116562" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  0707116562
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin size={16} className="text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Nairobi, Kenya
                </span>
              </li>
            </ul>
          </div>

          {/* FAQs & Policies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Help & Info</h3>
            <ul className="space-y-2">
              <li>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="#shipping" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Shipping & Returns
                </a>
              </li>
              <li>
                <a href="#size-guide" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Size Guide
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 SneakerStore. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Cookies
              </a>
            </div>
          </div>
          
          {/* Moving Developer Credit */}
          <div className="relative overflow-hidden bg-primary/5 rounded-lg py-2">
            <div className="animate-marquee whitespace-nowrap">
              <span className="text-sm text-primary font-medium mx-4">
                Developed and designed by Sam - Contact us at sammdev.ai@gmail.com for web designs
              </span>
              <span className="text-sm text-primary font-medium mx-4">
                Developed and designed by Sam - Contact us at sammdev.ai@gmail.com for web designs
              </span>
              <span className="text-sm text-primary font-medium mx-4">
                Developed and designed by Sam - Contact us at sammdev.ai@gmail.com for web designs
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;