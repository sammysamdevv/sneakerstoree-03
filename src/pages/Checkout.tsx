import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

const Checkout = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Check for affiliate referral from sessionStorage (product-specific)
  const getAffiliateReferral = () => {
    const stored = sessionStorage.getItem('affiliate_referral');
    return stored ? JSON.parse(stored) : null;
  };
  
  const affiliateReferral = getAffiliateReferral();

  // Remove M-Pesa payment for now - orders will be manually confirmed by admin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use affiliate from product-specific referral
      let finalAffiliateId = null;
      let commissionAmount = 0;

      if (affiliateReferral?.affiliate_id) {
        finalAffiliateId = affiliateReferral.affiliate_id;
        commissionAmount = totalAmount * 0.1; // 10% commission
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: totalAmount,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          delivery_address: customerInfo.address,
          affiliate_id: finalAffiliateId,
          commission_amount: commissionAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      // Create commission record using edge function if there's an affiliate
      if (finalAffiliateId && commissionAmount > 0) {
        try {
          await supabase.functions.invoke('create-affiliate-commission', {
            body: {
              order_id: order.id,
              commission_rate: 0.1 // 10% commission rate
            }
          });
        } catch (commissionError) {
          console.error('Commission creation error:', commissionError);
        }

        // Mark affiliate clicks as converted for this specific product referral
        const { error: conversionError } = await supabase
          .from('affiliate_clicks')
          .update({ converted: true, order_id: order.id })
          .eq('affiliate_id', finalAffiliateId)
          .eq('converted', false);

        if (conversionError) {
          console.error('Error marking clicks as converted:', conversionError);
        }

        // Clear the affiliate referral from session after successful order
        sessionStorage.removeItem('affiliate_referral');
      }

      // Clear cart and show success
      clearCart();
      
      toast({
        title: "Order placed successfully!",
        description: "Your order is pending admin confirmation. Payment will be handled upon confirmation.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error placing order",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Allow guest checkout - no authentication required

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <Button onClick={() => navigate("/")}>Continue Shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × KSh {item.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-medium">
                      KSh {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span>KSh {totalAmount.toLocaleString()}</span>
                </div>
                {affiliateReferral?.affiliate_code && (
                  <div className="text-sm text-muted-foreground">
                    Referred by: {affiliateReferral.affiliate_code}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+254700000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>
                  
                   <div className="pt-4">
                     <h3 className="font-semibold mb-2 flex items-center">
                       <CreditCard className="mr-2 h-4 w-4" />
                       Order Process
                     </h3>
                     <p className="text-sm text-muted-foreground mb-4">
                       Your order will be reviewed by our admin team. You'll be contacted with payment instructions once confirmed.
                     </p>
                   </div>
                   
                   <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Processing Order...
                       </>
                     ) : (
                       "Place Order for Admin Review"
                     )}
                   </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;