import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Sparkles, Clock, Trophy, Coins, Star, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useScratchCards } from "@/hooks/useScratchCards";

interface CustomerInfo {
  customer_id: string;
  customer_name: string;
  auth_user_id: string;
}

interface ScratchCardData {
  id: string;
  code: string;
  is_scratched: boolean;
  prize_type: string;
  prize_value: number;
  expires_at: string;
  created_at: string;
  scratched_at: string | null;
}

const ScratchCardPlay = () => {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [otp, setOtp] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [scratchCards, setScratchCards] = useState<ScratchCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [scratchingCard, setScratchingCard] = useState<string | null>(null);
  const { toast } = useToast();
  const { markCardAsScratched } = useScratchCards();

  const sendOTP = async () => {
    if (!phone) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        console.error('OTP error:', error);
        toast({
          title: "Error",
          description: "Failed to send OTP. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "Please check your phone for the verification code",
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error", 
        description: "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast({
          title: "Error",
          description: "Invalid OTP. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        setAuthenticated(true);
        await loadCustomerData();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerData = async () => {
    try {
      // Get customer info
      const { data: customerData, error: customerError } = await supabase.rpc(
        'verify_customer_login',
        { p_phone: phone }
      );

      if (customerError || !customerData || customerData.length === 0) {
        console.error('Error fetching customer data:', customerError);
        toast({
          title: "Error",
          description: "Customer not found",
          variant: "destructive",
        });
        return;
      }

      const customer = customerData[0];
      setCustomerInfo(customer);

      // Get scratch cards
      const { data: cards, error: cardsError } = await supabase
        .from('scratch_cards')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Error fetching scratch cards:', cardsError);
      } else {
        setScratchCards(cards || []);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const handleScratchCard = async (cardId: string) => {
    setScratchingCard(cardId);
    
    // Add a small delay for animation effect
    setTimeout(async () => {
      const success = await markCardAsScratched(cardId);
      if (success && customerInfo) {
        // Reload cards
        await loadCustomerData();
        toast({
          title: "🎉 Card Scratched!",
          description: "Check your prize revealed below!",
        });
      }
      setScratchingCard(null);
    }, 1500);
  };

  const getPrizeText = (card: ScratchCardData) => {
    if (card.prize_type === 'percentage_discount') {
      return `${card.prize_value}% OFF`;
    } else if (card.prize_type === 'amount_discount') {
      return `₹${card.prize_value} OFF`;
    } else {
      return 'Better Luck Next Time!';
    }
  };

  const getPrizeIcon = (card: ScratchCardData) => {
    if (card.prize_type === 'percentage_discount') {
      return <Trophy className="w-8 h-8 text-yellow-500" />;
    } else if (card.prize_type === 'amount_discount') {
      return <Coins className="w-8 h-8 text-green-500" />;
    } else {
      return <Star className="w-8 h-8 text-gray-400" />;
    }
  };

  const unscratched = scratchCards.filter(card => !card.is_scratched);
  const scratched = scratchCards.filter(card => card.is_scratched);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/20"></div>
        <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Gift className="w-6 h-6" />
              Scratch & Win!
            </CardTitle>
            <p className="text-purple-100">Enter your details to access your cards</p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                disabled={otpSent}
                className="border-2 focus:border-purple-500"
              />
            </div>
            
            {!otpSent ? (
              <Button 
                onClick={sendOTP} 
                disabled={loading || !phone}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3"
              >
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="border-2 focus:border-purple-500 text-center text-lg font-mono"
                  />
                </div>
                <Button 
                  onClick={verifyOTP} 
                  disabled={loading || !otp}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3"
                >
                  {loading ? "Verifying..." : "Verify & Enter"}
                </Button>
                <Button 
                  onClick={() => {setOtpSent(false); setOtp('');}} 
                  variant="outline"
                  className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  Change Number
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-4">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 mb-6 shadow-2xl border border-white/20">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
              <PartyPopper className="w-8 h-8 text-purple-600" />
              Your Scratch Cards
            </h1>
            <p className="text-xl text-gray-700 mt-2 font-medium">
              Welcome back, {customerInfo?.customer_name}! 🎉
            </p>
            <p className="text-gray-600 mt-1">Tap any card below to scratch and reveal your prize</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/95 backdrop-blur shadow-xl border border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Available Cards</CardTitle>
              <Gift className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{unscratched.length}</div>
              <p className="text-xs text-gray-600 mt-1">Ready to scratch</p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur shadow-xl border border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Cards</CardTitle>
              <Sparkles className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{scratchCards.length}</div>
              <p className="text-xs text-gray-600 mt-1">All time earned</p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur shadow-xl border border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Revealed Cards</CardTitle>
              <Clock className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{scratched.length}</div>
              <p className="text-xs text-gray-600 mt-1">Already scratched</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Scratch Cards */}
        {unscratched.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
              <Gift className="w-6 h-6" />
              🎫 Scratch Your Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unscratched.map((card) => (
                <Card 
                  key={card.id} 
                  className={`shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 border-2 ${
                    scratchingCard === card.id 
                      ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-yellow-300 animate-pulse' 
                      : 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 hover:shadow-yellow-500/50'
                  }`}
                  onClick={() => !scratchingCard && handleScratchCard(card.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-white text-xl font-bold">
                      {scratchingCard === card.id ? '✨ Scratching...' : '🎫 Tap to Scratch!'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="bg-white/90 rounded-xl p-4 shadow-inner">
                      <div className="text-3xl font-bold text-gray-800 font-mono tracking-wider">
                        {card.code}
                      </div>
                    </div>
                    
                    {scratchingCard === card.id ? (
                      <div className="text-white text-lg font-semibold animate-bounce">
                        🎰 Revealing your prize...
                      </div>
                    ) : (
                      <div className="text-white text-lg font-semibold">
                        Tap anywhere to reveal your prize! 🎁
                      </div>
                    )}
                    
                    <div className="text-white/80 text-sm flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      Earned: {new Date(card.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Revealed Prizes */}
        {scratched.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              🏆 Your Revealed Prizes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scratched.map((card) => (
                <Card key={card.id} className="bg-white/95 backdrop-blur shadow-xl border border-white/20">
                  <CardHeader className="text-center">
                    <CardTitle className="text-gray-800 text-lg">🎫 Scratched Card</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="text-2xl font-bold text-gray-700 font-mono">
                      {card.code}
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-6 border-2 border-purple-200">
                      <div className="flex items-center justify-center mb-3">
                        {getPrizeIcon(card)}
                      </div>
                      <div className="text-xl font-bold text-gray-800 mb-2">
                        {getPrizeText(card)}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires: {new Date(card.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Scratched: {new Date(card.scratched_at || card.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Cards Message */}
        {scratchCards.length === 0 && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-12 text-center shadow-2xl border border-white/20">
            <Gift size={80} className="mx-auto text-gray-400 mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">No Scratch Cards Yet</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              You'll earn 1 scratch card for every ₹150 you spend.<br />
              Keep shopping to collect more cards and win amazing prizes! 🎁
            </p>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl border border-white/20">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div className="space-y-3">
              <p className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Earn 1 scratch card for every ₹150 spent
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Tap any card to scratch and reveal prizes
              </p>
            </div>
            <div className="space-y-3">
              <p className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Win discounts, cashbacks, and special offers
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Prizes are valid for limited time after scratching
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScratchCardPlay;
