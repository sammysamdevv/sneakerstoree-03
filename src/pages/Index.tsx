import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import ProductSlider from "@/components/ProductSlider";
import HeroCarousel from "@/components/HeroCarousel";
import ProductGrid from "@/components/ProductGrid";
import WhatsAppButton from "@/components/WhatsAppButton";
import ChatBot from "@/components/ChatBot";
import Footer from "@/components/Footer";
import AdsPromotionsCarousel from "@/components/AdsPromotionsCarousel";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Removed general affiliate tracking from homepage
  // Now using product-specific affiliate links that track on individual product pages

  return (
    <>
      <SEOHead 
        title="Eden Sneakers - Premium Shoes & Footwear | edensneakers.co.ke"
        description="Shop premium sneakers, heels, sandals and more at Eden Sneakers Kenya. Browse our collection of Nike, Jordans, and quality footwear for men, women, and unisex styles."
        keywords="sneakers Kenya, shoes Kenya, footwear Kenya, Nike Kenya, Jordans Kenya, premium shoes, online shoe store Kenya"
        canonicalUrl="/"
      />
      <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Ads and Promotions Carousel */}
        <AdsPromotionsCarousel />
        
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">Discover Our Products</h2>
            <p className="text-muted-foreground">Browse through our amazing collection</p>
          </div>
          <ProductSlider />
        </section>
        
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground">Our top picks for you</p>
          </div>
          <HeroCarousel />
        </section>
        
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">Latest Products</h2>
            <p className="text-muted-foreground">Discover our newest arrivals</p>
          </div>
          <ProductGrid />
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Fixed position components */}
      <WhatsAppButton />
      <ChatBot />
      </div>
    </>
  );
};

export default Index;
