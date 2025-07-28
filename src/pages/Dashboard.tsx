import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import AffiliateWallet from "@/components/AffiliateWallet";
import { Copy, DollarSign, Link, Package, ShoppingBag } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  is_affiliate: boolean;
  affiliate_code: string;
  total_commission: number;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_name: string;
}

interface Commission {
  id: string;
  commission_amount: number;
  status: string;
  created_at: string;
  orders: {
    customer_name: string;
    total_amount: number;
  };
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
      fetchCommissions();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    setProfile(data);
  };

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, customer_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    setOrders(data || []);
  };

  const fetchCommissions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select(`
        id,
        commission_amount,
        status,
        created_at,
        orders!inner(
          customer_name,
          total_amount
        )
      `)
      .eq('affiliate_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching commissions:', error);
      return;
    }

    setCommissions(data || []);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      fetchProfile();
    }
    setUpdating(false);
  };

  const joinAffiliateProgram = async () => {
    await updateProfile({ is_affiliate: true });
  };

  const copyAffiliateCode = async () => {
    if (!profile?.affiliate_code) return;

    try {
      await navigator.clipboard.writeText(profile.affiliate_code);
      toast({
        title: "Code copied!",
        description: "Affiliate code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

  const totalEarnings = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const pendingEarnings = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {profile.full_name}!</h1>
          <p className="text-muted-foreground">Manage your account and track your activities</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="orders">My Orders</TabsTrigger>
            {profile.is_affiliate && <TabsTrigger value="affiliate">Affiliate</TabsTrigger>}
            {profile.is_affiliate && <TabsTrigger value="wallet">Wallet</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={profile.full_name || ''}
                        onChange={(e) => setProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profile.address || ''}
                      onChange={(e) => setProfile(prev => prev ? {...prev, address: e.target.value} : null)}
                      placeholder="Enter your delivery address"
                    />
                  </div>
                  <Button 
                    onClick={() => updateProfile({
                      full_name: profile.full_name,
                      phone: profile.phone,
                      address: profile.address
                    })}
                    disabled={updating}
                  >
                    {updating ? "Updating..." : "Update Profile"}
                  </Button>
                </CardContent>
              </Card>

              {!profile.is_affiliate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Join Affiliate Program</CardTitle>
                    <CardDescription>
                      Earn 10% commission on every sale you refer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={joinAffiliateProgram} disabled={updating}>
                      Join Affiliate Program
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">KSh {order.total_amount.toLocaleString()}</p>
                          <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {profile.is_affiliate && (
            <TabsContent value="affiliate">
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">KSh {totalEarnings.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">KSh {pendingEarnings.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Referrals</CardTitle>
                      <Link className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{commissions.length}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Your Affiliate Code</CardTitle>
                    <CardDescription>Use this code to create product-specific affiliate links</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={profile.affiliate_code}
                        readOnly
                      />
                      <Button onClick={copyAffiliateCode} size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Copy product affiliate links from individual product pages to earn commissions.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Commission History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commissions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No commissions yet</p>
                    ) : (
                      <div className="space-y-4">
                        {commissions.map((commission) => (
                          <div key={commission.id} className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">Sale from {commission.orders.customer_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(commission.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">KSh {commission.commission_amount.toLocaleString()}</p>
                              <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                                {commission.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {profile.is_affiliate && (
            <TabsContent value="wallet">
              <AffiliateWallet />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;