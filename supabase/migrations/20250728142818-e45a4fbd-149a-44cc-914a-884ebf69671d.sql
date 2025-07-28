-- Create product_images table to store multiple images per product
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.product_images 
ADD CONSTRAINT fk_product_images_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_display_order ON public.product_images(product_id, display_order);

-- Enable Row Level Security
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for product_images
CREATE POLICY "Everyone can view product images" 
ON public.product_images 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage product images" 
ON public.product_images 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Add trigger for updated_at
CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to get product images with fallback to main image_url
CREATE OR REPLACE FUNCTION public.get_product_images(product_uuid UUID)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  alt_text TEXT,
  display_order INTEGER,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First try to get images from product_images table
  RETURN QUERY
  SELECT 
    pi.id,
    pi.image_url,
    pi.alt_text,
    pi.display_order,
    pi.is_primary
  FROM public.product_images pi
  WHERE pi.product_id = product_uuid
  ORDER BY pi.display_order ASC, pi.created_at ASC;
  
  -- If no images found in product_images, fallback to main image_url from products table
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID as id,
      p.image_url,
      NULL::TEXT as alt_text,
      0 as display_order,
      true as is_primary
    FROM public.products p
    WHERE p.id = product_uuid AND p.image_url IS NOT NULL;
  END IF;
END;
$$;