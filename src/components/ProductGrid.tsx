import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  discount_percentage?: number;
  is_available: boolean;
}

interface ProductGridProps {
  categorySlug?: string;
  searchQuery?: string;
}

const ProductGrid = ({ categorySlug, searchQuery }: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('is_affiliate, affiliate_code')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            image_url,
            discount_percentage,
            is_available,
            categories!inner(slug)
          `);

        if (categorySlug) {
          query = query.eq('categories.slug', categorySlug);
        }

        if (searchQuery) {
          query = query.ilike('name', `%${searchQuery}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching products:', error);
          return;
        }

        setProducts(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug, searchQuery]);

  if (loading) {
    return (
    <div className="grid grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-muted-foreground">
          {searchQuery
            ? `No products match "${searchQuery}"`
            : "No products available in this category"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isAffiliate={userProfile?.is_affiliate}
          affiliateCode={userProfile?.affiliate_code}
        />
      ))}
    </div>
  );
};

export default ProductGrid;