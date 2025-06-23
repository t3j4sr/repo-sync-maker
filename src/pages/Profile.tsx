import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Store, Phone, Calendar, DollarSign, ShoppingCart, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  shopkeeper_name: string;
  shop_name: string;
  phone: string;
  created_at: string;
}

interface SalesData {
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    totalTransactions: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSalesData();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      console.log('Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      if (!data) {
        console.log('No profile found, creating one with proper metadata...');
        // Create profile using metadata from auth user
        const newProfileData = {
          id: user.id,
          phone: user.phone || user.user_metadata?.phone || '',
          shopkeeper_name: user.user_metadata?.shopkeeperName || user.user_metadata?.shopkeeper_name || 'New User',
          shop_name: user.user_metadata?.shopName || user.user_metadata?.shop_name || 'New Shop'
        };

        console.log('Creating profile with data:', newProfileData);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }
        setProfile(newProfile);
      } else {
        console.log('Profile found:', data);
        // If profile exists but has empty values, update with user metadata
        if ((!data.shopkeeper_name || data.shopkeeper_name === 'Unknown User') && user.user_metadata?.shopkeeperName) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              shopkeeper_name: user.user_metadata.shopkeeperName,
              shop_name: user.user_metadata.shopName || data.shop_name,
              phone: user.phone || user.user_metadata?.phone || data.phone
            })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating profile:', updateError);
            setProfile(data);
          } else {
            console.log('Profile updated with metadata:', updatedProfile);
            setProfile(updatedProfile);
          }
        } else {
          setProfile(data);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const fetchSalesData = async () => {
    if (!user) return;

    try {
      console.log('Fetching sales data for user:', user.id);
      
      // Get total sales amount - ONLY for current user's purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('amount')
        .eq('user_id', user.id); // Critical: Filter by current user only

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
        throw purchasesError;
      }

      console.log('Purchases data for current user only:', purchasesData);

      const totalSales = purchasesData.reduce((sum, purchase) => sum + purchase.amount, 0);
      const totalTransactions = purchasesData.length;

      // Get total customers count - ONLY for current user's customers
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id); // Critical: Filter by current user only

      if (customersError) {
        console.error('Error fetching customers count:', customersError);
        throw customersError;
      }

      console.log('Customers count for current user only:', customersCount);

      setSalesData({
        totalSales,
        totalTransactions,
        totalCustomers: customersCount || 0
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Shopkeeper Name</p>
                      <p className="font-medium">{profile.shopkeeper_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Shop Name</p>
                      <p className="font-medium">{profile.shop_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{profile.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="font-medium">{formatDate(profile.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesData.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From your customers only
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {salesData.totalTransactions}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your purchase transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Customers</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {salesData.totalCustomers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your unique customers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Your Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Average Transaction Value</span>
                  <span className="font-medium">
                    {salesData.totalTransactions > 0 
                      ? formatCurrency(salesData.totalSales / salesData.totalTransactions)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Average Sales per Customer</span>
                  <span className="font-medium">
                    {salesData.totalCustomers > 0 
                      ? formatCurrency(salesData.totalSales / salesData.totalCustomers)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
