-- Grant admin privileges to sammyseth260@gmail.com
UPDATE public.profiles 
SET is_admin = true 
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sammyseth260@gmail.com'
);