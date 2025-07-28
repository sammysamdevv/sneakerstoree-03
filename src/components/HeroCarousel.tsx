import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  discount_percentage?: number;
}

const HeroCarousel = () => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, image_url, discount_percentage')
          .eq('is_featured', true)
          .eq('is_available', true)
          .limit(5);

        if (error) {
          console.error('Error fetching featured products:', error);
          return;
        }

        setFeaturedProducts(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">Loading featured products...</span>
      </div>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Welcome to Sneaker Store</h2>
          <p className="text-muted-foreground">Discover amazing sneakers and footwear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredProducts.map((product) => {
          const discountedPrice = product.discount_percentage
            ? product.price * (1 - product.discount_percentage / 100)
            : product.price;

          // Get the full URL for the image from Supabase storage
          const imageUrl = product.image_url 
            ? supabase.storage.from('product-images').getPublicUrl(product.image_url).data.publicUrl
            : null;

          return (
            <Card key={product.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-muted/50 to-muted">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span>No Image</span>
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {product.discount_percentage && product.discount_percentage > 0 && (
                    <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground">
                      -{product.discount_percentage}% OFF
                    </Badge>
                  )}
                  
                  {/* Product Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {product.discount_percentage && product.discount_percentage > 0 ? (
                          <>
                            <span className="text-xl font-bold">
                              KSh {discountedPrice.toLocaleString()}
                            </span>
                            <span className="text-sm text-gray-300 line-through">
                              KSh {product.price.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-bold">
                            KSh {product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-white text-black hover:bg-gray-100"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default HeroCarousel;