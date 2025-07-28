-- Add RLS policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM profiles 
  WHERE id = auth.uid() AND is_admin = true
));