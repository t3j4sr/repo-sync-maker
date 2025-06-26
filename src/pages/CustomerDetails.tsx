
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Activity, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddPurchaseModal } from "@/components/AddPurchaseModal";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  user_id: string;
}

interface Purchase {
  id: string;
  amount: number;
  created_at: string;
  customer_id: string;
  user_id: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata: any;
}

const CustomerDetails = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const fetchCustomerData = async () => {
    if (!user || !customerId) return;

    try {
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch purchase history
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('customer_id', customerId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (purchaseError) throw purchaseError;
      setPurchases(purchaseData || []);

      // Fetch customer-related activities
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entity_id', customerId)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;
      setActivities(activityData || []);

    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [user, customerId]);

  const handlePurchaseAdded = async () => {
    await fetchCustomerData();
    // Log the activity - we'll get the purchase data from the most recent purchase
    if (customer) {
      await logActivity(
        'purchase_added',
        'purchase',
        customer.id, // Use customer ID as entity ID since we don't have the specific purchase ID
        `Added purchase for ${customer.name}`,
        { 
          customer_id: customerId,
          customer_name: customer.name
        }
      );
    }
  };

  const handleTestScratchCards = () => {
    if (!customer) return;
    
    const testUrl = `/play-scratch-cards?phone=${encodeURIComponent(customer.phone)}`;
    window.open(testUrl, '_blank');
  };

  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Customer Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleTestScratchCards}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Test Link
          </Button>
          <Button
            onClick={() => setShowActivities(!showActivities)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <Activity className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-t-3xl min-h-[calc(100vh-100px)] p-6">
          {/* Customer Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-purple-100 text-purple-600 font-medium text-lg">
                      {customer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{customer.name}</CardTitle>
                    <p className="text-gray-600 text-lg">{customer.phone}</p>
                    <p className="text-sm text-gray-500">
                      Customer since {formatDate(customer.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsPurchaseModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Purchase
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Total Purchases Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                Rs {totalPurchases}
              </div>
              <p className="text-gray-600">
                {purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'}
              </p>
            </CardContent>
          </Card>

          {/* Purchase History or Activities */}
          <Card>
            <CardHeader>
              <CardTitle>
                {showActivities ? 'Customer Activity History' : 'Purchase History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showActivities ? (
                activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No activities recorded for this customer
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{activity.description}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(activity.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                purchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No purchases yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">Rs {purchase.amount}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(purchase.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        open={isPurchaseModalOpen}
        onOpenChange={setIsPurchaseModalOpen}
        customerId={customer.id}
        customerName={customer.name}
        onPurchaseAdded={handlePurchaseAdded}
      />
    </div>
  );
};

export default CustomerDetails;
