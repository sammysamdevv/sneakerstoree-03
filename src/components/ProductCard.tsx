import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  discount_percentage?: number;
  is_available: boolean;
}

interface ProductCardProps {
  product: Product;
  isAffiliate?: boolean;
  affiliateCode?: string;
}

const ProductCard = ({ product, isAffiliate, affiliateCode }: ProductCardProps) => {
  const { toast } = useToast();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const discountedPrice = product.discount_percentage
    ? product.price * (1 - product.discount_percentage / 100)
    : product.price;

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  };

  const handleCopyAffiliateLink = async () => {
    if (!affiliateCode) return;
    
    // Use current domain for affiliate links
    const currentDomain = window.location.origin;
    const affiliateLink = `${currentDomain}/product/${product.id}?ref=${affiliateCode}`;
    
    try {
      await navigator.clipboard.writeText(affiliateLink);
      toast({
        title: "Link Copied!",
        description: "Affiliate link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = () => {
    const finalPrice = product.discount_percentage && product.discount_percentage > 0 
      ? discountedPrice 
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
  };

  const handleProductClick = () => {
    const url = affiliateCode 
      ? `/product/${product.id}?ref=${affiliateCode}` 
      : `/product/${product.id}`;
    navigate(url);
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={handleProductClick}>
          {product.image_url ? (
            <img
              src={getImageUrl(product.image_url) || ''}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
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
            <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
              -{product.discount_percentage}%
            </Badge>
          )}
          
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors" onClick={handleProductClick}>{product.name}</h3>
          <div className="flex items-center space-x-2">
            {product.discount_percentage && product.discount_percentage > 0 ? (
              <>
                <span className="text-xl font-bold text-primary">
                  KSh {discountedPrice.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  KSh {product.price.toLocaleString()}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-primary">
                KSh {product.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex flex-col space-y-2">
        <div className="flex space-x-2 w-full">
          <Button 
            variant="outline"
            className="flex-1" 
            onClick={handleProductClick}
          >
            View Details
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleAddToCart}
            disabled={!product.is_available}
          >
            Add to Cart
          </Button>
        </div>
        
        {isAffiliate && affiliateCode && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleCopyAffiliateLink}
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Affiliate Link
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;