import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package, ShoppingBag, Users, DollarSign, Check, X, Upload, Video, Image as ImageIcon, ChevronDown, Menu, AlertTriangle, Database } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id: string;
  image_url: string;
  is_available: boolean;
  is_featured: boolean;
  discount_percentage: number;
  categories: { name: string };
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  affiliate_id?: string;
  profiles?: { full_name: string; affiliate_code: string };
}

interface Commission {
  id: string;
  commission_amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  paid_out: boolean;
  profiles: { full_name: string; affiliate_code: string };
  orders: { customer_name: string; total_amount: number };
}

interface AffiliatePayout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  payout_method: string;
  profiles: { full_name: string; affiliate_code: string };
}

interface AffiliateUser {
  id: string;
  full_name: string;
  affiliate_code: string;
  total_commission: number;
  balance: number;
  clicks: number;
}

type AdminSection = 'products' | 'orders' | 'users' | 'affiliates' | 'commissions' | 'payouts' | 'promotional' | 'ads' | 'data-management';

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [affiliateUsers, setAffiliateUsers] = useState<AffiliateUser[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalCommissions: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [promotionalContent, setPromotionalContent] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedAdImage, setSelectedAdImage] = useState<File | null>(null);
  const [promotionalForm, setPromotionalForm] = useState({
    title: '',
    description: '',
    content_type: 'video' as 'video' | 'image' | 'text',
  });
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    target_url: '',
    promotional_content_id: '',
  });

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    is_featured: false,
    discount_percentage: '',
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('products');
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchOrders(),
      fetchCommissions(),
      fetchPayouts(),
      fetchAffiliateUsers(),
      fetchCategories(),
      fetchStats(),
      fetchUsers(),
      fetchPromotionalContent(),
      fetchAds(),
    ]);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!affiliate_id(full_name, affiliate_code)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
  };

  const fetchCommissions = async () => {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select(`
        *,
        profiles!affiliate_id(full_name, affiliate_code),
        orders(customer_name, total_amount)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching commissions:', error);
    } else {
      setCommissions(data || []);
    }
  };

  const fetchPayouts = async () => {
    const { data, error } = await supabase
      .from('affiliate_payouts')
      .select(`
        id,
        affiliate_id,
        amount,
        status,
        requested_at,
        processed_at,
        payout_method
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching payouts:', error);
      setPayouts([]);
      return;
    }

    // Get profile information separately for each payout
    const payoutsWithProfiles = await Promise.all(
      (data || []).map(async (payout) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, affiliate_code')
          .eq('id', payout.affiliate_id)
          .single();

        return {
          ...payout,
          profiles: profile || { full_name: 'Unknown', affiliate_code: 'N/A' }
        };
      })
    );

    setPayouts(payoutsWithProfiles);
  };

  const fetchAffiliateUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, affiliate_code, total_commission')
      .eq('is_affiliate', true);

    if (error) {
      console.error('Error fetching affiliate users:', error);
      return;
    }

    // Get balances and clicks for each affiliate
    const usersWithStats = await Promise.all(
      (data || []).map(async (user) => {
        // Get balance using the database function
        const { data: balanceData } = await supabase
          .rpc('get_affiliate_balance', { affiliate_user_id: user.id });
        
        // Get clicks count
        const { count: clicksCount } = await supabase
          .from('affiliate_clicks')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_id', user.id);

        return {
          ...user,
          balance: balanceData?.[0]?.available_balance || 0,
          clicks: clicksCount || 0
        };
      })
    );

    setAffiliateUsers(usersWithStats);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null);

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  const fetchStats = async () => {
    const { data: orderStats } = await supabase
      .from('orders')
      .select('total_amount, status');

    const { data: commissionStats } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount, status');

    if (orderStats) {
      const totalRevenue = orderStats.reduce((sum, order) => sum + order.total_amount, 0);
      const pendingOrders = orderStats.filter(order => order.status === 'pending').length;
      
      setStats({
        totalOrders: orderStats.length,
        totalRevenue,
        pendingOrders,
        totalCommissions: commissionStats?.reduce((sum, comm) => sum + comm.commission_amount, 0) || 0,
      });
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, is_affiliate, is_admin, affiliate_code, total_commission')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    // Get balances for affiliate users
    const usersWithBalances = await Promise.all(
      (data || []).map(async (user) => {
        if (user.is_affiliate && user.id) {
          const { data: balanceData } = await supabase
            .rpc('get_affiliate_balance', { affiliate_user_id: user.id });
          
          return {
            ...user,
            balance: balanceData?.[0]?.available_balance || 0,
          };
        }
        return { ...user, balance: 0 };
      })
    );

    setUsers(usersWithBalances);
  };

  const fetchPromotionalContent = async () => {
    const { data, error } = await supabase
      .from('promotional_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotional content:', error);
    } else {
      setPromotionalContent(data || []);
    }
  };

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from('ads')
      .select('*, promotional_content(title)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ads:', error);
    } else {
      setAds(data || []);
    }
  };

  const handleImageUpload = async (productId: string): Promise<string | null> => {
    if (!selectedImage) return null;

    const fileExt = selectedImage.name.split('.').pop();
    const fileName = `${productId}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, selectedImage, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    return filePath;
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let productId = editingProduct;
      
      // First create/update the product without image_url
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        category_id: productForm.category_id,
        is_featured: productForm.is_featured,
        discount_percentage: parseInt(productForm.discount_percentage) || 0,
        is_available: true,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Upload image if selected
      if (selectedImage && productId) {
        const imagePath = await handleImageUpload(productId);
        
        if (imagePath) {
          // Update product with image path
          await supabase
            .from('products')
            .update({ image_url: imagePath })
            .eq('id', productId);
        }
      }

      toast({
        title: editingProduct ? "Product updated" : "Product created",
        description: `Product has been ${editingProduct ? 'updated' : 'created'} successfully.`,
      });

      setProductForm({
        name: '',
        description: '',
        price: '',
        stock: '',
        category_id: '',
        is_featured: false,
        discount_percentage: '',
      });
      setSelectedImage(null);
      setImagePreview(null);
      setEditingProduct(null);
      setDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      // Get the product to check if it has an image
      const { data: product } = await supabase
        .from('products')
        .select('image_url')
        .eq('id', productId)
        .single();

      // Delete the product from database
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // Delete the associated image from storage if it exists
      if (product?.image_url) {
        await supabase.storage
          .from('product-images')
          .remove([product.image_url]);
      }

      toast({
        title: "Product deleted",
        description: "Product has been deleted successfully.",
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      // Automatically process commission when order status changes
      try {
        await supabase.functions.invoke('process-affiliate-commissions', {
          body: {
            action: 'process_order',
            order_id: orderId
          }
        });
      } catch (functionError) {
        console.error('Error processing commission:', functionError);
        // Don't fail the whole operation if commission processing fails
      }

      const statusMessage = status === 'confirmed' ? 
        'Order confirmed and ready for delivery (payment assumed)!' :
        status === 'delivered' ? 'Order marked as delivered.' :
        status === 'cancelled' ? 'Order cancelled.' :
        `Order status updated to ${status}.`;

      toast({
        title: "Order updated",
        description: statusMessage,
      });

      fetchOrders();
      fetchCommissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleCommissionStatusUpdate = async (commissionId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = user?.id;
      }

      const { error } = await supabase
        .from('affiliate_commissions')
        .update(updateData)
        .eq('id', commissionId);

      if (error) throw error;

      toast({
        title: "Commission updated",
        description: `Commission status updated to ${status}.`,
      });
      fetchCommissions();
      fetchAffiliateUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayoutStatusUpdate = async (payoutId: string, status: string) => {
    try {
      if (status === 'completed') {
        // Use the edge function for automatic processing
        const { data, error } = await supabase.functions.invoke('process-payout-completion', {
          body: {
            payout_id: payoutId,
            processed_by: user?.id
          }
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Failed to process payout completion');
        }

        toast({
          title: "Payout completed successfully",
          description: `Payout of KSh ${(data.amount_processed || 0).toLocaleString()} has been processed and ${data.deductions_created || 0} commission deductions have been created.`,
        });
      } else {
        // For other status updates (like rejected), just update the status
        const updateData: any = { status };
        
        if (status === 'rejected') {
          updateData.processed_at = new Date().toISOString();
          updateData.processed_by = user?.id;
        }

        const { error } = await supabase
          .from('affiliate_payouts')
          .update(updateData)
          .eq('id', payoutId);

        if (error) throw error;

        toast({
          title: "Payout updated",
          description: `Payout status updated to ${status}.`,
        });
      }

      fetchPayouts();
      fetchAffiliateUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  };

  const editProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category_id,
      is_featured: product.is_featured,
      discount_percentage: product.discount_percentage?.toString() || '',
    });
    setEditingProduct(product.id);
    setDialogOpen(true);
  };

  // User management handlers
  const handlePromoteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('promote_user_to_admin', {
        target_user_id: userId
      });

      if (error) throw error;

      if ((data as any).success) {
        toast({
          title: "User promoted",
          description: "User has been promoted to admin successfully.",
        });
        fetchUsers();
      } else {
        throw new Error((data as any).error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Promotional content handlers
  const handleVideoUpload = async (): Promise<string | null> => {
    if (!selectedVideoFile) return null;

    const fileExt = selectedVideoFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('promotional-videos')
      .upload(filePath, selectedVideoFile);

    if (uploadError) {
      console.error('Error uploading video:', uploadError);
      return null;
    }

    return filePath;
  };

  const handlePromotionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let contentUrl = null;
      
      if (promotionalForm.content_type === 'video' && selectedVideoFile) {
        contentUrl = await handleVideoUpload();
      }

      const { error } = await supabase
        .from('promotional_content')
        .insert({
          title: promotionalForm.title,
          description: promotionalForm.description,
          content_type: promotionalForm.content_type,
          content_url: contentUrl,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Promotional content created",
        description: "Promotional content has been created successfully.",
      });

      setPromotionalForm({
        title: '',
        description: '',
        content_type: 'video',
      });
      setSelectedVideoFile(null);
      fetchPromotionalContent();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Ad handlers
  const handleAdImageUpload = async (): Promise<string | null> => {
    if (!selectedAdImage) return null;

    const fileExt = selectedAdImage.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `ads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ad-images')
      .upload(filePath, selectedAdImage);

    if (uploadError) {
      console.error('Error uploading ad image:', uploadError);
      return null;
    }

    return filePath;
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const imageUrl = await handleAdImageUpload();

      const { error } = await supabase
        .from('ads')
        .insert({
          title: adForm.title,
          description: adForm.description,
          target_url: adForm.target_url,
          promotional_content_id: adForm.promotional_content_id || null,
          image_url: imageUrl,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Ad created",
        description: "Ad has been created successfully.",
      });

      setAdForm({
        title: '',
        description: '',
        target_url: '',
        promotional_content_id: '',
      });
      setSelectedAdImage(null);
      fetchAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAd = async (adId: string) => {
    try {
      // Get the ad to check if it has an image
      const { data: ad } = await supabase
        .from('ads')
        .select('image_url')
        .eq('id', adId)
        .single();

      // Delete the ad from database
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      // Delete the associated image from storage if it exists
      if (ad?.image_url) {
        await supabase.storage
          .from('ad-images')
          .remove([ad.image_url]);
      }

      toast({
        title: "Ad deleted",
        description: "Advertisement has been deleted successfully.",
      });
      fetchAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePromotionalContent = async (contentId: string) => {
    try {
      // Get the promotional content to check if it has a video/content file
      const { data: content } = await supabase
        .from('promotional_content')
        .select('content_url')
        .eq('id', contentId)
        .single();

      // Delete the promotional content from database
      const { error } = await supabase
        .from('promotional_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      // Delete the associated video/content from storage if it exists
      if (content?.content_url) {
        await supabase.storage
          .from('promotional-videos')
          .remove([content.content_url]);
      }

      toast({
        title: "Promotional content deleted",
        description: "Promotional content has been deleted successfully.",
      });
      fetchPromotionalContent();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClearAllData = async () => {
    if (!confirm("⚠️ WARNING: This will permanently delete ALL user data including orders, commissions, affiliate clicks, and reset all balances. This action cannot be undone. Are you absolutely sure?")) {
      return;
    }

    const confirmText = prompt("Type 'DELETE' to confirm this action:");
    if (confirmText !== 'DELETE') {
      toast({
        title: "Action Cancelled",
        description: "Data clearing cancelled - confirmation text did not match.",
      });
      return;
    }

    setIsClearing(true);
    
    try {
      // Delete data in proper order (foreign key constraints)
      const operations = [
        supabase.from('commission_deductions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('affiliate_payouts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('affiliate_commissions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('affiliate_clicks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ];

      // Execute deletions
      for (const operation of operations) {
        const { error } = await operation;
        if (error) {
          console.error('Deletion error:', error);
          // Continue with other deletions even if one fails
        }
      }

      // Reset affiliate fields in profiles
      const { error: resetError } = await supabase
        .from('profiles')
        .update({ 
          total_commission: 0,
          affiliate_code: null,
          is_affiliate: false
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (resetError) {
        console.error('Reset error:', resetError);
      }

      toast({
        title: "Data Cleared Successfully",
        description: "All user transactional data has been permanently deleted. The system is now reset.",
      });

      // Refresh all data
      await fetchData();
      
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage your sneaker store</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {stats.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {stats.totalCommissions.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Section Navigation */}
        <div className="flex justify-between items-center mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-60">
                <Menu className="h-4 w-4 mr-2" />
                {activeSection === 'products' && 'Product Management'}
                {activeSection === 'orders' && 'Order Management'}
                {activeSection === 'users' && 'User Management'}
                {activeSection === 'affiliates' && 'Affiliate Management'}
                {activeSection === 'commissions' && 'Commission Management'}
                {activeSection === 'payouts' && 'Payout Management'}
                {activeSection === 'promotional' && 'Promotional Content'}
                {activeSection === 'ads' && 'Advertisement Management'}
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="start">
              <DropdownMenuItem onClick={() => setActiveSection('products')}>
                <Package className="h-4 w-4 mr-2" />
                Product Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('orders')}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Order Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('users')}>
                <Users className="h-4 w-4 mr-2" />
                User Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('affiliates')}>
                <DollarSign className="h-4 w-4 mr-2" />
                Affiliate Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('commissions')}>
                <Check className="h-4 w-4 mr-2" />
                Commission Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('payouts')}>
                <DollarSign className="h-4 w-4 mr-2" />
                Payout Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('promotional')}>
                <Video className="h-4 w-4 mr-2" />
                Promotional Content
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('ads')}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Advertisement Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('data-management')}>
                <Database className="h-4 w-4 mr-2" />
                Data Management
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {activeSection === 'products' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Management</CardTitle>
                    <CardDescription>Add, edit, and manage your products</CardDescription>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          name: '',
                          description: '',
                          price: '',
                          stock: '',
                          category_id: '',
                          is_featured: false,
                          discount_percentage: '',
                        });
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                        <DialogDescription>
                          {editingProduct ? 'Update product information' : 'Add a new product to your store'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleProductSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Product Name</Label>
                          <Input
                            id="name"
                            value={productForm.name}
                            onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={productForm.description}
                            onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="price">Price (KSh)</Label>
                            <Input
                              id="price"
                              type="number"
                              value={productForm.price}
                              onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="stock">Stock</Label>
                            <Input
                              id="stock"
                              type="number"
                              value={productForm.stock}
                              onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select 
                            value={productForm.category_id} 
                            onValueChange={(value) => setProductForm(prev => ({ ...prev, category_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="image">Product Image</Label>
                          <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                          {imagePreview && (
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="mt-2 w-20 h-20 object-cover rounded"
                            />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="discount">Discount %</Label>
                          <Input
                            id="discount"
                            type="number"
                            value={productForm.discount_percentage}
                            onChange={(e) => setProductForm(prev => ({ ...prev, discount_percentage: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="featured"
                            checked={productForm.is_featured}
                            onChange={(e) => setProductForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                          />
                          <Label htmlFor="featured">Featured Product</Label>
                        </div>
                        <Button type="submit" className="w-full">
                          {editingProduct ? 'Update Product' : 'Add Product'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4 space-y-3">
                        {/* Product Image */}
                        <div className="aspect-square w-full">
                          {product.image_url ? (
                            <img
                              src={getImageUrl(product.image_url) || ''}
                              alt={product.name}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {product.categories?.name}
                          </p>
                          <p className="font-bold text-sm">KSh {product.price.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                          
                          {/* Badges */}
                          <div className="flex flex-wrap gap-1">
                            {product.is_featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                            {product.discount_percentage > 0 && (
                              <Badge variant="destructive" className="text-xs">-{product.discount_percentage}%</Badge>
                            )}
                            <Badge variant={product.is_available ? "default" : "secondary"} className="text-xs">
                              {product.is_available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => editProduct(product)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {products.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No products found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'orders' && (
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>View and manage customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                           <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                           <p className="text-sm text-muted-foreground">
                             {order.customer_name} • {order.customer_phone}
                           </p>
                           <p className="text-sm text-muted-foreground">
                             {order.delivery_address}
                           </p>
                           {order.profiles?.affiliate_code && (
                             <p className="text-sm text-muted-foreground">
                               Affiliate: {order.profiles.full_name} ({order.profiles.affiliate_code})
                             </p>
                           )}
                         </div>
                        <div className="text-right">
                          <p className="font-bold">KSh {order.total_amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                       <div className="flex items-center justify-between">
                         <Badge 
                           variant={
                             order.status === 'delivered' ? 'default' : 
                             order.status === 'pending' ? 'destructive' :
                             order.status === 'confirmed' ? 'secondary' : 'outline'
                           }
                         >
                           {order.status === 'pending' ? 'Awaiting Confirmation' : order.status}
                         </Badge>
                         <div className="flex space-x-2">
                           {order.status === 'pending' && (
                             <Button
                               size="sm"
                               onClick={() => handleOrderStatusUpdate(order.id, 'confirmed')}
                               className="bg-green-600 hover:bg-green-700"
                             >
                               <Check className="h-4 w-4 mr-1" />
                               Confirm Order
                             </Button>
                           )}
                           {order.status === 'confirmed' && (
                             <Button
                               size="sm"
                               onClick={() => handleOrderStatusUpdate(order.id, 'delivered')}
                             >
                               <Check className="h-4 w-4 mr-1" />
                               Mark Delivered
                             </Button>
                           )}
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleOrderStatusUpdate(order.id, 'cancelled')}
                           >
                             <X className="h-4 w-4 mr-1" />
                             Cancel
                           </Button>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'affiliates' && (
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Users</CardTitle>
                <CardDescription>View all affiliate partners and their performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {affiliateUsers.map((affiliate) => (
                    <div key={affiliate.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{affiliate.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code: {affiliate.affiliate_code}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Clicks: {affiliate.clicks}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">Available: KSh {affiliate.balance.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            Total Earned: KSh {affiliate.total_commission?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {affiliateUsers.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No affiliate users found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'commissions' && (
            <Card>
              <CardHeader>
                <CardTitle>Commission Management</CardTitle>
                <CardDescription>Review and approve affiliate commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {commission.profiles?.full_name || 'Unknown Affiliate'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Code: {commission.profiles?.affiliate_code}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sale: {commission.orders?.customer_name} - KSh {commission.orders?.total_amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">KSh {commission.commission_amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(commission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          commission.status === 'approved' ? 'default' : 
                          commission.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {commission.status}
                        </Badge>
                        <div className="flex space-x-2">
                          {commission.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleCommissionStatusUpdate(commission.id, 'approved')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCommissionStatusUpdate(commission.id, 'rejected')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {commissions.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No commissions found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'payouts' && (
            <Card>
              <CardHeader>
                <CardTitle>Payout Management</CardTitle>
                <CardDescription>Process affiliate payout requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {payout.profiles?.full_name || 'Unknown Affiliate'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Code: {payout.profiles?.affiliate_code}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Method: {payout.payout_method}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">KSh {(payout.amount || 0).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested: {new Date(payout.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          payout.status === 'completed' ? 'default' : 
                          payout.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {payout.status}
                        </Badge>
                        <div className="flex space-x-2">
                          {payout.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handlePayoutStatusUpdate(payout.id, 'completed')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Mark Paid
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayoutStatusUpdate(payout.id, 'rejected')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {payouts.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No payout requests found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View all registered users and manage admin roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Affiliate Code</TableHead>
                        <TableHead>Available Balance</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.phone || 'N/A'}</TableCell>
                          <TableCell>
                            {user.is_affiliate ? (
                              <Badge variant="secondary">{user.affiliate_code}</Badge>
                            ) : (
                              'Not an affiliate'
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_affiliate ? `KSh ${user.balance.toLocaleString()}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_admin ? "default" : "outline"}>
                              {user.is_admin ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!user.is_admin && (
                              <Button
                                size="sm"
                                onClick={() => handlePromoteUser(user.id)}
                              >
                                Promote to Admin
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'promotional' && (
            <Card>
              <CardHeader>
                <CardTitle>Promotional Content</CardTitle>
                <CardDescription>Create and manage promotional videos and content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Create Promotional Content Form */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Create New Promotional Content</h3>
                    <form onSubmit={handlePromotionalSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="promo-title">Title</Label>
                          <Input
                            id="promo-title"
                            value={promotionalForm.title}
                            onChange={(e) => setPromotionalForm(prev => ({ ...prev, title: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="content-type">Content Type</Label>
                          <Select
                            value={promotionalForm.content_type}
                            onValueChange={(value: any) => setPromotionalForm(prev => ({ ...prev, content_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="promo-description">Description</Label>
                        <Textarea
                          id="promo-description"
                          value={promotionalForm.description}
                          onChange={(e) => setPromotionalForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      {promotionalForm.content_type === 'video' && (
                        <div>
                          <Label htmlFor="video-file">Upload Video</Label>
                          <Input
                            id="video-file"
                            type="file"
                            accept="video/*"
                            onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
                          />
                        </div>
                      )}
                      <Button type="submit">
                        <Video className="h-4 w-4 mr-2" />
                        Create Promotional Content
                      </Button>
                    </form>
                  </div>

                  {/* Existing Promotional Content */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Existing Promotional Content</h3>
                    {promotionalContent.map((content) => (
                      <div key={content.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{content.title}</h4>
                            <p className="text-sm text-muted-foreground">{content.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline">{content.content_type}</Badge>
                              <Badge variant={content.is_active ? "default" : "secondary"}>
                                {content.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-muted-foreground">
                              {new Date(content.created_at).toLocaleDateString()}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePromotionalContent(content.id)}
                              className="ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'ads' && (
            <Card>
              <CardHeader>
                <CardTitle>Advertisement Management</CardTitle>
                <CardDescription>Create and manage ads with direct links to promotional content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Create Ad Form */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Create New Advertisement</h3>
                    <form onSubmit={handleAdSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ad-title">Ad Title</Label>
                          <Input
                            id="ad-title"
                            value={adForm.title}
                            onChange={(e) => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="target-url">Target URL</Label>
                          <Input
                            id="target-url"
                            type="url"
                            value={adForm.target_url}
                            onChange={(e) => setAdForm(prev => ({ ...prev, target_url: e.target.value }))}
                            required
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="ad-description">Description</Label>
                        <Textarea
                          id="ad-description"
                          value={adForm.description}
                          onChange={(e) => setAdForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="promo-content">Link to Promotional Content (Optional)</Label>
                        <Select
                          value={adForm.promotional_content_id}
                          onValueChange={(value) => setAdForm(prev => ({ ...prev, promotional_content_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select promotional content" />
                          </SelectTrigger>
                          <SelectContent>
                            {promotionalContent.map((content) => (
                              <SelectItem key={content.id} value={content.id}>
                                {content.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ad-image">Ad Image</Label>
                        <Input
                          id="ad-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSelectedAdImage(e.target.files?.[0] || null)}
                        />
                      </div>
                      <Button type="submit">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Create Advertisement
                      </Button>
                    </form>
                  </div>

                   {/* Existing Ads */}
                   <div className="space-y-4">
                     <h3 className="font-semibold">Existing Advertisements</h3>
                     {ads.map((ad) => (
                       <div key={ad.id} className="border rounded-lg p-4">
                         <div className="flex justify-between items-start">
                           <div className="flex-1">
                             <h4 className="font-semibold">{ad.title}</h4>
                             <p className="text-sm text-muted-foreground">{ad.description}</p>
                             <p className="text-sm text-blue-600 mt-1">
                               Target: <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="underline">
                                 {ad.target_url}
                               </a>
                             </p>
                             {ad.promotional_content && (
                               <p className="text-sm text-muted-foreground">
                                 Linked to: {ad.promotional_content.title}
                               </p>
                             )}
                             <div className="flex items-center space-x-2 mt-2">
                               <Badge variant={ad.is_active ? "default" : "secondary"}>
                                 {ad.is_active ? "Active" : "Inactive"}
                               </Badge>
                               <Badge variant="outline">
                                 {ad.click_count} clicks
                               </Badge>
                             </div>
                           </div>
                           <div className="flex items-center space-x-2">
                             <div className="text-sm text-muted-foreground">
                               {new Date(ad.created_at).toLocaleDateString()}
                             </div>
                             <Button
                               variant="destructive"
                               size="sm"
                               onClick={() => handleDeleteAd(ad.id)}
                               className="ml-2"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'data-management' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  System administration tools for managing user data and resetting the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Data Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{orders.length}</p>
                          <p className="text-sm text-muted-foreground">Total Orders</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{commissions.length}</p>
                          <p className="text-sm text-muted-foreground">Commissions</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{payouts.length}</p>
                          <p className="text-sm text-muted-foreground">Payouts</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{affiliateUsers.length}</p>
                          <p className="text-sm text-muted-foreground">Affiliates</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Danger Zone */}
                  <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-red-800">Danger Zone</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">Clear All User Data</h4>
                        <p className="text-sm text-red-600 mb-4">
                          This action will permanently delete all user transactional data including:
                        </p>
                        <ul className="text-sm text-red-600 list-disc list-inside mb-4 space-y-1">
                          <li>All order history and order items</li>
                          <li>All affiliate commissions and commission deductions</li>
                          <li>All affiliate payout requests</li>
                          <li>All affiliate click tracking data</li>
                          <li>Reset all user balances to zero</li>
                          <li>Remove all affiliate codes and status</li>
                        </ul>
                        <p className="text-sm text-red-600 font-semibold mb-4">
                          ⚠️ This action cannot be undone and will reset the entire system!
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Note: User accounts, profiles, products, and categories will be preserved.
                        </p>
                        
                        <Button
                          onClick={handleClearAllData}
                          disabled={isClearing}
                          variant="destructive"
                          className="w-full md:w-auto"
                        >
                          {isClearing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Clearing Data...
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Clear All User Data
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;