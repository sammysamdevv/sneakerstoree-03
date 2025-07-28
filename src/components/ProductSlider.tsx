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
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import Autoplay from "embla-carousel-autoplay";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  discount_percentage?: number;
}

const ProductSlider = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddToCart = (product: Product) => {
    console.log('Add to Cart clicked for product:', product.name);
    try {
      const finalPrice = product.discount_percentage 
        ? product.price * (1 - product.discount_percentage / 100)
        : product.price;

      addItem({
        id: product.id,
        name: product.name,
        price: finalPrice,
        image_url: product.image_url
      });

      toast({
        title: "Success!",
        description: `${product.name} added to cart successfully`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, description, price, image_url, discount_percentage')
          .eq('is_available', true)
          .limit(10);

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
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">Loading products...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">No Products Available</h2>
          <p className="text-muted-foreground">Check back soon for new arrivals</p>
        </div>
      </div>
    );
  }

  return (
    <Carousel 
      className="w-full max-w-6xl mx-auto" 
      opts={{ 
        align: "start", 
        loop: true,
        dragFree: true
      }}
      plugins={[
        Autoplay({
          delay: 5000,
          stopOnInteraction: false,
          stopOnMouseEnter: false,
          stopOnFocusIn: false
        }),
      ]}
    >
      <CarouselContent>
        {products.map((product) => {
          const discountedPrice = product.discount_percentage
            ? product.price * (1 - product.discount_percentage / 100)
            : product.price;

          // Get the full URL for the image from Supabase storage
          const imageUrl = product.image_url 
            ? supabase.storage.from('product-images').getPublicUrl(product.image_url).data.publicUrl
            : null;

          return (
            <CarouselItem key={product.id}>
              <Card className="border-0 shadow-none">
                <CardContent className="p-0">
                  <div className="relative h-[400px] overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="container mx-auto px-6 flex items-center justify-between">
                        <div className="flex-1 max-w-lg">
                          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                            {product.name}
                          </h1>
                          {product.description && (
                            <p className="text-lg text-muted-foreground mb-6 line-clamp-3">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mb-6">
                            {product.discount_percentage && product.discount_percentage > 0 ? (
                              <>
                                <span className="text-3xl font-bold text-primary">
                                  KSh {discountedPrice.toLocaleString()}
                                </span>
                                <span className="text-xl text-muted-foreground line-through">
                                  KSh {product.price.toLocaleString()}
                                </span>
                                <Badge className="bg-destructive text-destructive-foreground">
                                  -{product.discount_percentage}% OFF
                                </Badge>
                              </>
                            ) : (
                              <span className="text-3xl font-bold text-primary">
                                KSh {product.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-3">
                            <Button 
                              variant="outline"
                              size="lg" 
                              className="text-lg px-6"
                              onClick={() => navigate(`/product/${product.id}`)}
                            >
                              View Details
                            </Button>
                            <Button 
                              size="lg" 
                              className="text-lg px-8"
                              onClick={() => handleAddToCart(product)}
                            >
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                        
                        {imageUrl && (
                          <div className="hidden md:block flex-1 max-w-md">
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="w-full h-auto max-h-80 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-4" />
      <CarouselNext className="right-4" />
    </Carousel>
  );
};

export default ProductSlider;