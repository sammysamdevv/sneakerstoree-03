import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import SEOHead from "@/components/SEOHead";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const categoryNames: { [key: string]: string } = {
    'women-shoes': 'Women Shoes',
    'men-shoes': 'Men Shoes',
    'unisex-shoes': 'Unisex Shoes',
    'sandals': 'Sandals',
    'women-sneakers': 'Women Sneakers',
    'heels': 'Heels',
    'flats': 'Flats',
    'women-unisex-sneakers': 'Unisex Sneakers',
    'jordans': 'Jordans',
    'nike': 'Nike',
    'loafers': 'Loafers',
    'casual': 'Casual',
    'men-unisex-sneakers': 'Unisex Sneakers',
  };

  const categoryName = slug ? categoryNames[slug] || slug : 'Products';

  return (
    <>
      <SEOHead 
        title={`Buy ${categoryName} Online Kenya - Authentic & Affordable | Eden Sneakers`}
        description={`Shop original ${categoryName.toLowerCase()} online in Kenya! Authentic brands, affordable prices, fast delivery to Nairobi, Mombasa, Kisumu. Best ${categoryName.toLowerCase()} deals in Kenya.`}
        keywords={`${categoryName.toLowerCase()} Kenya, buy ${categoryName.toLowerCase()} online Kenya, affordable ${categoryName.toLowerCase()} Kenya, original ${categoryName.toLowerCase()} Kenya, ${categoryName.toLowerCase()} Nairobi, ${categoryName.toLowerCase()} Mombasa, ${categoryName.toLowerCase()} Kisumu, cheap ${categoryName.toLowerCase()} Kenya, best ${categoryName.toLowerCase()} Kenya, ${categoryName.toLowerCase()} sale Kenya, authentic ${categoryName.toLowerCase()} Kenya`}
        canonicalUrl={`/category/${slug}`}
      />
      <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{categoryName}</h1>
          <p className="text-muted-foreground">
            Browse our collection of {categoryName.toLowerCase()}
          </p>
        </div>
        
        <ProductGrid categorySlug={slug} />
      </main>
      </div>
    </>
  );
};

export default CategoryPage;