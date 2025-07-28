import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Products = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  return (
    <>
      <SEOHead 
        title={searchQuery ? `${searchQuery} - Buy Online Kenya | Eden Sneakers` : "All Sneakers & Shoes Online Kenya - Authentic & Affordable | Eden Sneakers"}
        description={searchQuery ? `Find authentic ${searchQuery} online in Kenya! Best prices, fast delivery to Nairobi, Mombasa, Kisumu. Original brands guaranteed.` : "Browse all authentic sneakers & shoes online in Kenya! Jordans, Nike, designer sneakers for men & women. Affordable prices, fast delivery nationwide."}
        keywords={searchQuery ? `${searchQuery} Kenya, buy ${searchQuery} online Kenya, ${searchQuery} Nairobi, ${searchQuery} Mombasa, affordable ${searchQuery} Kenya, original ${searchQuery} Kenya` : "all sneakers Kenya, buy sneakers online Kenya, sneakers for men Kenya, sneakers for women Kenya, Jordans Kenya, Nike Kenya, shoes online Kenya, sneaker store Kenya, affordable sneakers Kenya"}
        canonicalUrl="/products"
      />
      <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {searchQuery 
              ? `Products matching "${searchQuery}"`
              : 'Browse our complete collection of shoes'
            }
          </p>
        </div>
        
        <ProductGrid searchQuery={searchQuery || undefined} />
      </main>
      <Footer />
      </div>
    </>
  );
};

export default Products;