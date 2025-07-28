import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useProductImages } from "@/hooks/useProductImages";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  discount_percentage?: number;
  is_available: boolean;
  description?: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { images, primaryImage, getImageUrl: getProductImageUrl } = useProductImages(id || '');

  const referralCode = searchParams.get('ref');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          title: "Error",
          description: "Failed to load product",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    
    // Track affiliate click for this specific product
    const affiliateCode = searchParams.get('ref');
    if (affiliateCode) {
      trackAffiliateClick(affiliateCode);
    }
  }, [id, toast, searchParams]);

  const trackAffiliateClick = async (affiliateCode: string) => {
    try {
      // Find affiliate by code
      const { data: affiliate } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('affiliate_code', affiliateCode)
        .single();

      if (affiliate) {
        // Track the click
        await supabase
          .from('affiliate_clicks')
          .insert({
            affiliate_id: affiliate.id,
            referrer_url: window.location.href,
            user_agent: navigator.userAgent,
            session_id: `session_${Date.now()}`
          });

        // Store affiliate info in session for purchase tracking
        sessionStorage.setItem('affiliate_referral', JSON.stringify({
          affiliate_id: affiliate.id,
          affiliate_code: affiliateCode,
          product_id: id
        }));

        toast({
          title: "Welcome!",
          description: `You were referred by ${affiliate.full_name}. You'll get special benefits on your purchase!`,
        });
      }
    } catch (error) {
      console.error('Error tracking affiliate click:', error);
    }
  };


  const handleAddToCart = () => {
    if (!product) return;

    const finalPrice = product.discount_percentage && product.discount_percentage > 0 
      ? product.price * (1 - product.discount_percentage / 100)
      : product.price;
      
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image_url: product.image_url
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.name} added to cart`,
    });

    // Track affiliate referral if present
    if (referralCode) {
      toast({
        title: "Referral Tracked",
        description: "Purchase will credit the referring affiliate",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Product not found</div>
        </div>
      </div>
    );
  }

  const discountedPrice = product.discount_percentage
    ? product.price * (1 - product.discount_percentage / 100)
    : product.price;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {/* Main Image */}
            <Card>
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden">
                   {images.length > 0 ? (
                    <img
                      src={getProductImageUrl(images[selectedImageIndex]?.image_url)}
                      alt={images[selectedImageIndex]?.alt_text || product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">No Image</span>
                    </div>
                  )}
                  
                  {product.discount_percentage && product.discount_percentage > 0 && (
                    <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
                      -{product.discount_percentage}%
                    </Badge>
                  )}
                  
                  {!product.is_available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary">Out of Stock</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Additional Images Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <div 
                    key={image.id} 
                    className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer border-2 transition-colors ${
                      selectedImageIndex === index ? 'border-primary' : 'border-muted hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={getProductImageUrl(image.image_url)}
                      alt={image.alt_text || `${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
              
              <div className="flex items-center space-x-2 mb-4">
                {product.discount_percentage && product.discount_percentage > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-primary">
                      KSh {discountedPrice.toLocaleString()}
                    </span>
                    <span className="text-xl text-muted-foreground line-through">
                      KSh {product.price.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    KSh {product.price.toLocaleString()}
                  </span>
                )}
              </div>

              {product.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              {referralCode && (
                <div className="mb-4 p-3 bg-accent rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    💝 You're shopping through an affiliate link! The referring partner will earn a commission from this purchase.
                  </p>
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.is_available}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;