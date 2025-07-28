-- Add admin role to profiles
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create admin policies for products (admin can manage all products)
CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create admin policies for orders (admin can view/manage all orders)
CREATE POLICY "Admins can view all orders" 
ON public.orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update all orders" 
ON public.orders FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create admin policies for affiliate commissions
CREATE POLICY "Admins can view all commissions" 
ON public.affiliate_commissions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create admin policies for categories
CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create admin policies for order items
CREATE POLICY "Admins can view all order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Insert products policies for general users to view
CREATE POLICY "Users can view available products" 
ON public.products FOR SELECT 
USING (is_available = true OR auth.uid() IS NOT NULL);

-- Create sample admin user (you can change this email)
-- First create the profile if it doesn't exist, then update it to admin
DO $$
BEGIN
  -- This will be handled when the user signs up
END $$;