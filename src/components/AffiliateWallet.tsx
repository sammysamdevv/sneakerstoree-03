import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Clock, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WalletBalance {
  total_earned: number;
  total_pending: number;
  total_approved: number;
  total_paid: number;
  available_balance: number;
}

interface Commission {
  id: string;
  commission_amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  paid_out: boolean;
  orders: {
    customer_name: string;
    total_amount: number;
  };
}

interface Click {
  id: string;
  clicked_at: string;
  referrer_url: string | null;
  converted: boolean;
  user_agent: string | null;
  ip_address: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  requested_at: string;
  processed_at: string | null;
}

const AffiliateWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaName, setMpesaName] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      console.log('Fetching wallet data for user:', user.id);
      
      // First verify user is an affiliate
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_affiliate, affiliate_code')
        .eq('id', user.id)
        .single();

      console.log('Profile data:', { profileData, profileError });
      
      if (profileError || !profileData?.is_affiliate) {
        console.log('User is not an affiliate');
        setLoading(false);
        return;
      }
      
      // Fetch balance using the database function
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_affiliate_balance', { affiliate_user_id: user.id });

      console.log('Balance query result:', { balanceData, balanceError });
      
      if (balanceError) throw balanceError;
      if (balanceData && balanceData.length > 0) {
        setBalance(balanceData[0]);
        console.log('Balance set:', balanceData[0]);
      } else {
        console.log('No balance data found');
      }

      // Fetch commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select(`
          id,
          commission_amount,
          status,
          created_at,
          approved_at,
          paid_out,
          order_id,
          orders (
            customer_name,
            total_amount
          )
        `)
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Commissions query result:', { commissionsData, commissionsError });
      
      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('requested_at', { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayouts(payoutsData || []);

      // Fetch clicks
      const { data: clicksData, error: clicksError } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('clicked_at', { ascending: false })
        .limit(50);

      console.log('Clicks query result:', { clicksData, clicksError });
      
      if (clicksError) throw clicksError;
      setClicks(clicksData || []);

    } catch (error: any) {
      toast({
        title: "Error fetching wallet data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutRequest = async () => {
    if (!user || !balance) return;

    const amount = parseFloat(payoutAmount);
    if (amount <= 0 || amount > balance.available_balance) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount within your available balance.",
        variant: "destructive",
      });
      return;
    }

    if (!mpesaPhone || !mpesaName) {
      toast({
        title: "Missing M-Pesa Details",
        description: "Please provide your M-Pesa phone number and full name.",
        variant: "destructive",
      });
      return;
    }

    setRequestingPayout(true);
    try {
      // Use the database function to create payout and reserve commissions
      const { data, error } = await supabase
        .rpc('request_affiliate_payout', {
          p_affiliate_id: user.id,
          p_amount: amount
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; payout_id?: string };

      if (!result.success) {
        toast({
          title: "Payout request failed",
          description: result.error || "Unable to process payout request.",
          variant: "destructive",
        });
        return;
      }

      // Update the created payout with M-Pesa details
      if (result.payout_id) {
        const { error: updateError } = await supabase
          .from('affiliate_payouts')
          .update({
            mpesa_phone_number: mpesaPhone,
            mpesa_full_name: mpesaName,
            payout_method: 'mpesa'
          })
          .eq('id', result.payout_id);

        if (updateError) {
          console.error('Error updating payout with M-Pesa details:', updateError);
        }
      }

      toast({
        title: "Payout requested successfully",
        description: `Your payout request for KSh ${amount.toLocaleString()} has been submitted and the amount has been reserved from your available balance.`,
      });

      setPayoutAmount("");
      setMpesaPhone("");
      setMpesaName("");
      fetchWalletData(); // Refresh to show updated balance
    } catch (error: any) {
      toast({
        title: "Error requesting payout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequestingPayout(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200"><DollarSign className="w-3 h-3 mr-1" />Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold">KSh {balance?.available_balance?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">KSh {balance?.total_earned?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">KSh {balance?.total_pending?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Request */}
      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payoutAmount">Amount (KSh)</Label>
            <Input
              id="payoutAmount"
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              max={balance?.available_balance || 0}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Available: KSh {balance?.available_balance?.toLocaleString() || '0'}
            </p>
          </div>
          
          <div>
            <Label htmlFor="mpesaPhone">M-Pesa Phone Number</Label>
            <Input
              id="mpesaPhone"
              type="tel"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="e.g., 254712345678"
            />
          </div>

          <div>
            <Label htmlFor="mpesaName">Full Name (As registered on M-Pesa)</Label>
            <Input
              id="mpesaName"
              type="text"
              value={mpesaName}
              onChange={(e) => setMpesaName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          
          <Button 
            onClick={handlePayoutRequest} 
            disabled={requestingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0 || !mpesaPhone || !mpesaName}
          >
            {requestingPayout ? "Requesting..." : "Request Payout"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No commissions yet</p>
            ) : (
              commissions.map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">KSh {commission.commission_amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Order from {commission.orders.customer_name} - KSh {commission.orders.total_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(commission.status)}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clicks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No clicks yet</p>
            ) : (
              clicks.map((click) => (
                <div key={click.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(click.clicked_at).toLocaleDateString()} at{' '}
                      {new Date(click.clicked_at).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {click.referrer_url ? `From: ${click.referrer_url}` : 'Direct link'}
                    </p>
                    {click.user_agent && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {click.user_agent.split(' ')[0]} browser
                      </p>
                    )}
                  </div>
                  <Badge variant={click.converted ? "default" : "secondary"}>
                    {click.converted ? "Converted" : "Visit"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payouts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No payouts yet</p>
            ) : (
              payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">KSh {payout.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested: {new Date(payout.requested_at).toLocaleDateString()}
                    </p>
                    {payout.processed_at && (
                      <p className="text-xs text-muted-foreground">
                        Processed: {new Date(payout.processed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(payout.status)}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateWallet;