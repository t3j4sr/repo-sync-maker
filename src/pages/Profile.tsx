import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogOut, User, Store, DollarSign, ShoppingCart, Users, Gift, Send, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileData {
  shopkeeper_name: string;
  shop_name: string;
  phone: string;
  created_at: string;
}

interface StatsData {
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
  averageTransaction: number;
  averageSalesPerCustomer: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [statsData, setStatsData] = useState<StatsData>({
    totalSales: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    averageTransaction: 0,
    averageSalesPerCustomer: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    shopkeeperName: "",
    shopName: ""
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Scratch card state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [numberOfCards, setNumberOfCards] = useState<number>(1);
  const [scratchCardLoading, setScratchCardLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
      fetchStatsData();
      fetchCustomers();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfileData(profile);
      setEditForm({
        shopkeeperName: profile.shopkeeper_name,
        shopName: profile.shop_name
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsData = async () => {
    if (!user) return;

    try {
      // Get total customers for this user
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id);

      if (customersError) throw customersError;

      // Get all purchases for this user's customers
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('amount')
        .eq('user_id', user.id);

      if (purchasesError) throw purchasesError;

      const totalCustomers = customers?.length || 0;
      const totalTransactions = purchases?.length || 0;
      const totalSales = purchases?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0;
      const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;
      const averageSalesPerCustomer = totalCustomers > 0 ? totalSales / totalCustomers : 0;

      setStatsData({
        totalSales,
        totalTransactions,
        totalCustomers,
        averageTransaction,
        averageSalesPerCustomer
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const generateRandomCode = () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  const generatePrize = () => {
    const rand = Math.random();
    if (rand < 0.1) return { type: 'percentage_discount', value: 30 };
    if (rand < 0.2) return { type: 'percentage_discount', value: 20 };
    if (rand < 0.3) return { type: 'amount_discount', value: 50 };
    if (rand < 0.4) return { type: 'amount_discount', value: 30 };
    return { type: 'better_luck', value: 0 };
  };

  const handleGenerateAndSend = async () => {
    if (!selectedCustomerId || !user) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setScratchCardLoading(true);
    const codes: string[] = [];

    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      if (!selectedCustomer) throw new Error('Customer not found');

      // Generate scratch cards
      for (let i = 0; i < numberOfCards; i++) {
        const code = generateRandomCode();
        const prize = generatePrize();
        codes.push(code);

        // Store in database
        const { error } = await supabase
          .from('scratch_cards')
          .insert({
            customer_id: selectedCustomerId,
            code: code,
            prize_type: prize.type,
            prize_value: prize.value,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
          });

        if (error) {
          console.error('Error storing scratch card:', error);
        }
      }

      setGeneratedCodes(codes);

      // Format phone for scratch card URL
      let phoneForUrl = selectedCustomer.phone;
      if (!phoneForUrl.startsWith('+')) {
        phoneForUrl = `+91${phoneForUrl.replace(/^0+/, '')}`;
      }

      // Send SMS
      try {
        console.log('Attempting to send SMS to:', selectedCustomer.phone);
        
        const { data, error } = await supabase.functions.invoke('send-scratch-card-sms', {
          body: {
            phone: selectedCustomer.phone,
            customerName: selectedCustomer.name,
            cardsCount: numberOfCards,
            totalPurchase: 0 // Manual sending, no purchase amount
          }
        });

        console.log('SMS function response:', data);

        if (error) {
          console.error('SMS function error:', error);
          throw error;
        }

        if (data?.error) {
          console.error('SMS service error:', data);
          if (data.code === 21608) {
            toast({
              title: "Cards Generated ✅",
              description: `${numberOfCards} scratch cards created! SMS not sent - phone number needs verification in Twilio trial account.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Cards Generated ✅", 
              description: `${numberOfCards} scratch cards created! SMS error: ${data.error}`,
              variant: "destructive",
            });
          }
        } else {
          console.log('SMS sent successfully:', data);
          toast({
            title: "Success! 🎉",
            description: `${numberOfCards} scratch cards sent to ${selectedCustomer.name} via SMS`,
          });
        }
      } catch (smsError) {
        console.error('SMS Error:', smsError);
        toast({
          title: "Cards Generated ✅",
          description: `${numberOfCards} scratch cards created but SMS failed to send`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error generating scratch cards:', error);
      toast({
        title: "Error",
        description: "Failed to generate scratch cards",
        variant: "destructive",
      });
    } finally {
      setScratchCardLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profileData) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          shopkeeper_name: editForm.shopkeeperName,
          shop_name: editForm.shopName
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfileData({
        ...profileData,
        shopkeeper_name: editForm.shopkeeperName,
        shop_name: editForm.shopName
      });

      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>

      <div className="flex-1 bg-white rounded-t-3xl min-h-[calc(100vh-80px)] p-6">
        {/* Account Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Details
              </CardTitle>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shopkeeperName">Shopkeeper Name</Label>
                    <Input
                      id="shopkeeperName"
                      value={editForm.shopkeeperName}
                      onChange={(e) => setEditForm({ ...editForm, shopkeeperName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input
                      id="shopName"
                      value={editForm.shopName}
                      onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {updating ? "Updating..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        shopkeeperName: profileData?.shopkeeper_name || "",
                        shopName: profileData?.shop_name || ""
                      });
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Shopkeeper Name</p>
                  <p className="font-medium">{profileData?.shopkeeper_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Shop Name</p>
                  <p className="font-medium">{profileData?.shop_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                  <p className="font-medium">{profileData?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Member Since</p>
                  <p className="font-medium">
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{statsData.totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From your customers only</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Transactions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statsData.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">Your purchase transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{statsData.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Your unique customers</p>
            </CardContent>
          </Card>
        </div>

        {/* PROMINENT SCRATCH CARDS SECTION - RIGHT AFTER STATS */}
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Gift className="h-6 w-6" />
              🎁 Send Scratch Cards to Your Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-select" className="text-sm font-medium text-gray-700">
                  Select Customer
                </Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="card-count" className="text-sm font-medium text-gray-700">
                  Number of Cards (1-10)
                </Label>
                <Input
                  id="card-count"
                  type="number"
                  min="1"
                  max="10"
                  value={numberOfCards}
                  onChange={(e) => setNumberOfCards(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleGenerateAndSend} 
              disabled={scratchCardLoading || !selectedCustomerId}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3"
              size="lg"
            >
              {scratchCardLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Generating & Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Generate & Send Scratch Cards
                </>
              )}
            </Button>

            {generatedCodes.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-medium mb-3 text-purple-700">✅ Generated Codes:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {generatedCodes.map((code, index) => (
                    <div key={index} className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg text-center font-mono text-sm border border-purple-200">
                      <div className="font-bold text-purple-800">{code}</div>
                    </div>
                  ))}
                </div>
                
                {/* ADD SCRATCH CARD LINK FOR TESTING */}
                {selectedCustomerId && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <h5 className="font-medium text-green-700 mb-2">🎯 Test Scratch Card Link:</h5>
                    <div className="text-sm text-gray-700 mb-2">
                      Click this link to test the scratch card experience:
                    </div>
                    <Button
                      onClick={() => {
                        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
                        if (selectedCustomer) {
                          let phoneForUrl = selectedCustomer.phone;
                          if (!phoneForUrl.startsWith('+')) {
                            phoneForUrl = `+91${phoneForUrl.replace(/^0+/, '')}`;
                          }
                          const scratchUrl = `/play-scratch-cards?phone=${encodeURIComponent(phoneForUrl)}`;
                          window.open(scratchUrl, '_blank');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                    >
                      🎫 Open Scratch Cards (Test Link)
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  📱 SMS sent to selected customer with scratch card link
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Your Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Your Average Transaction Value</span>
                <span className="font-bold">₹{statsData.averageTransaction.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Your Average Sales per Customer</span>
                <span className="font-bold">₹{statsData.averageSalesPerCustomer.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
