import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export const useProductImages = (productId: string) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductImages = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try to get images from product_images table
        const { data: productImages, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        if (imagesError) {
          console.error('Error fetching product images:', imagesError);
          setError(imagesError.message);
          return;
        }

        if (productImages && productImages.length > 0) {
          setImages(productImages);
        } else {
          // Fallback to main product image_url if no images in product_images table
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('image_url')
            .eq('id', productId)
            .single();

          if (productError) {
            console.error('Error fetching product:', productError);
            setError(productError.message);
            return;
          }

          if (product?.image_url) {
            setImages([{
              id: `fallback-${productId}`,
              image_url: product.image_url,
              alt_text: null,
              display_order: 0,
              is_primary: true,
            }]);
          } else {
            setImages([]);
          }
        }
      } catch (err) {
        console.error('Error in useProductImages:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductImages();
    }
  }, [productId]);

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  };

  const primaryImage = images.find(img => img.is_primary) || images[0];

  return {
    images,
    primaryImage,
    loading,
    error,
    getImageUrl,
  };
};