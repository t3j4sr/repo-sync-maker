import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Phone, Calendar, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScratchCardsPage } from "./ScratchCardsPage";

interface CustomerData {
  customer_id: string;
  customer_name: string;
  phone: string;
  created_at: string;
  total_purchases: number;
  scratch_cards_count: number;
}

export const CustomerDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScratchCards, setShowScratchCards] = useState(false);

  useEffect(() => {
    if (user && user.phone) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user?.phone) return;

    try {
      setLoading(true);
      
      // Get customer details
      const { data: customerInfo, error: customerError } = await supabase.rpc(
        'verify_customer_login',
        { p_phone: user.phone }
      );

      if (customerError) {
        console.error('Error fetching customer data:', customerError);
        toast({
          title: "Error",
          description: "Failed to load your information",
          variant: "destructive",
        });
        return;
      }

      if (!customerInfo || customerInfo.length === 0) {
        toast({
          title: "Error",
          description: "Customer information not found",
          variant: "destructive",
        });
        return;
      }

      const customer = customerInfo[0];

      // Get purchase total
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('amount')
        .eq('customer_id', customer.customer_id);

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
      }

      const totalPurchases = purchases?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0;

      // Get scratch cards count
      const { data: scratchCards, error: scratchCardsError } = await supabase
        .from('scratch_cards')
        .select('id')
        .eq('customer_id', customer.customer_id);

      if (scratchCardsError) {
        console.error('Error fetching scratch cards:', scratchCardsError);
      }

      // Get customer details from customers table
      const { data: customerDetails, error: detailsError } = await supabase
        .from('customers')
        .select('phone, created_at')
        .eq('id', customer.customer_id)
        .single();

      if (detailsError) {
        console.error('Error fetching customer details:', detailsError);
      }

      setCustomerData({
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        phone: customerDetails?.phone || user.phone,
        created_at: customerDetails?.created_at || '',
        total_purchases: totalPurchases,
        scratch_cards_count: scratchCards?.length || 0,
      });

    } catch (error) {
      console.error('Error in fetchCustomerData:', error);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out",
    });
  };

  const handleViewScratchCards = () => {
    setShowScratchCards(true);
  };

  const handleBackFromScratchCards = () => {
    setShowScratchCards(false);
    // Refresh data when coming back
    fetchCustomerData();
  };

  if (showScratchCards) {
    return <ScratchCardsPage onBack={handleBackFromScratchCards} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading your information...</div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Error</h1>
          <p className="text-gray-600 mb-6">Unable to load your customer information</p>
          <Button onClick={handleSignOut} className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome Back!</h1>
              <p className="text-gray-600">Good to see you, {customerData.customer_name}</p>
            </div>
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Customer Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Name</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerData.customer_name}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phone Number</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerData.phone}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Since</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(customerData.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                ₹{customerData.total_purchases.toFixed(2)}
              </div>
              <p className="text-gray-600 mt-2">
                Total amount spent with your shopkeeper
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl cursor-pointer hover:shadow-2xl transition-shadow" onClick={handleViewScratchCards}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Scratch Cards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">
                {customerData.scratch_cards_count}
              </div>
              <p className="text-gray-600 mt-2">
                Lucky draw cards earned (1 card per ₹150 spent)
              </p>
              <Button className="mt-4 w-full" onClick={handleViewScratchCards}>
                View My Cards
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lucky Draw Program</h2>
          <p className="text-gray-600">
            Keep shopping to earn more scratch cards and win exciting prizes!
          </p>
        </div>
      </div>
    </div>
  );
};
