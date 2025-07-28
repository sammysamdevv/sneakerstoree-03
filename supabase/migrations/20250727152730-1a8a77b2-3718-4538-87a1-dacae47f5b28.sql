-- Create promotional_content table
CREATE TABLE public.promotional_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image', 'text')),
  content_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ads table
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_url TEXT NOT NULL,
  promotional_content_id UUID REFERENCES public.promotional_content(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create policies for promotional_content
CREATE POLICY "Everyone can view active promotional content" 
ON public.promotional_content 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage promotional content" 
ON public.promotional_content 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Create policies for ads
CREATE POLICY "Everyone can view active ads" 
ON public.ads 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage ads" 
ON public.ads 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Create triggers for updated_at
CREATE TRIGGER update_promotional_content_updated_at
BEFORE UPDATE ON public.promotional_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for promotional content
INSERT INTO storage.buckets (id, name, public) VALUES ('promotional-videos', 'promotional-videos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true);

-- Create storage policies for promotional videos
CREATE POLICY "Promotional videos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'promotional-videos');

CREATE POLICY "Admins can upload promotional videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'promotional-videos' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update promotional videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'promotional-videos' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can delete promotional videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'promotional-videos' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Create storage policies for ad images
CREATE POLICY "Ad images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ad-images');

CREATE POLICY "Admins can upload ad images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ad-images' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update ad images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ad-images' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can delete ad images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ad-images' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admins can promote users'
    );
  END IF;
  
  -- Update user to admin
  UPDATE profiles 
  SET is_admin = true 
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User promoted to admin successfully'
  );
END;
$$;