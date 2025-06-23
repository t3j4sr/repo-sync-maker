
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Store, Phone, Calendar, DollarSign, ShoppingCart, ArrowLeft, Edit2, Save, X } from "lucide-react";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    shopkeeper_name: "",
    shop_name: ""
  });

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
        setEditedProfile({
          shopkeeper_name: newProfile.shopkeeper_name,
          shop_name: newProfile.shop_name
        });
      } else {
        console.log('Profile found:', data);
        setProfile(data);
        setEditedProfile({
          shopkeeper_name: data.shopkeeper_name,
          shop_name: data.shop_name
        });
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
        .eq('user_id', user.id);

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
        .eq('user_id', user.id);

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

  const handleSaveProfile = async () => {
    if (!profile || !user) return;

    if (!editedProfile.shopkeeper_name.trim() || !editedProfile.shop_name.trim()) {
      toast({
        title: "Error",
        description: "Shopkeeper name and shop name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          shopkeeper_name: editedProfile.shopkeeper_name.trim(),
          shop_name: editedProfile.shop_name.trim()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        shopkeeper_name: editedProfile.shopkeeper_name.trim(),
        shop_name: editedProfile.shop_name.trim()
      } : null);

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditedProfile({
        shopkeeper_name: profile.shopkeeper_name,
        shop_name: profile.shop_name
      });
    }
    setIsEditing(false);
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Details
                </CardTitle>
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={loading}
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Shopkeeper Name</p>
                      {isEditing ? (
                        <Input
                          value={editedProfile.shopkeeper_name}
                          onChange={(e) => setEditedProfile(prev => ({
                            ...prev,
                            shopkeeper_name: e.target.value
                          }))}
                          placeholder="Enter shopkeeper name"
                        />
                      ) : (
                        <p className="font-medium">{profile.shopkeeper_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Shop Name</p>
                      {isEditing ? (
                        <Input
                          value={editedProfile.shop_name}
                          onChange={(e) => setEditedProfile(prev => ({
                            ...prev,
                            shop_name: e.target.value
                          }))}
                          placeholder="Enter shop name"
                        />
                      ) : (
                        <p className="font-medium">{profile.shop_name}</p>
                      )}
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
                      <p className="font-medium">{new Date(profile.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
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
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(salesData.totalSales)}
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
                      ? new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(salesData.totalSales / salesData.totalTransactions)
                      : new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Average Sales per Customer</span>
                  <span className="font-medium">
                    {salesData.totalCustomers > 0 
                      ? new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(salesData.totalSales / salesData.totalCustomers)
                      : new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(0)
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
