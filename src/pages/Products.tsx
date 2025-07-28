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
        title={searchQuery ? `Search Results for "${searchQuery}" | Sneaker Store` : "All Products | Sneaker Store"}
        description={searchQuery ? `Find shoes matching "${searchQuery}" at Sneaker Store Kenya.` : "Browse all shoes and footwear at Sneaker Store. Premium sneakers, heels, sandals for men, women, and unisex styles."}
        keywords={searchQuery ? `${searchQuery}, shoes Kenya, sneakers Kenya` : "all products, shoes Kenya, sneakers Kenya, footwear Kenya, online shoe store"}
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