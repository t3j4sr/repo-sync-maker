import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Sparkles, Clock, Trophy, Coins } from "lucide-react";
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
}

interface ScratchSummary {
  total_cards: number;
  unscratched_cards: number;
  scratched_cards: number;
  total_percentage_discount: number;
  total_amount_discount: number;
  cards_data: ScratchCardData[];
}

const ScratchCards = () => {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [otp, setOtp] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [scratchSummary, setScratchSummary] = useState<ScratchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
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

      // Get scratch cards summary
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        'get_customer_scratch_summary',
        { customer_uuid: customer.customer_id }
      );

      if (summaryError) {
        console.error('Error fetching scratch summary:', summaryError);
      } else if (summaryData && summaryData.length > 0) {
        const rawSummary = summaryData[0];
        // Parse the cards_data from Json to ScratchCardData[] with proper type conversion
        const parsedCardsData = Array.isArray(rawSummary.cards_data) 
          ? (rawSummary.cards_data as unknown as ScratchCardData[])
          : [];
        
        const processedSummary: ScratchSummary = {
          total_cards: rawSummary.total_cards,
          unscratched_cards: rawSummary.unscratched_cards,
          scratched_cards: rawSummary.scratched_cards,
          total_percentage_discount: rawSummary.total_percentage_discount,
          total_amount_discount: rawSummary.total_amount_discount,
          cards_data: parsedCardsData
        };
        
        setScratchSummary(processedSummary);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const handleScratchCard = async (cardId: string) => {
    const success = await markCardAsScratched(cardId);
    if (success && customerInfo) {
      // Reload scratch summary
      await loadCustomerData();
      toast({
        title: "Card Scratched!",
        description: "Check your prize below",
      });
    }
  };

  const getPrizeText = (card: ScratchCardData) => {
    if (card.prize_type === 'percentage_discount') {
      return `${card.prize_value}% OFF`;
    } else if (card.prize_type === 'amount_discount') {
      return `Rs ${card.prize_value} OFF`;
    } else {
      return 'Better Luck Next Time';
    }
  };

  const getPrizeIcon = (card: ScratchCardData) => {
    if (card.prize_type === 'percentage_discount') {
      return <Trophy className="w-8 h-8 text-yellow-500" />;
    } else if (card.prize_type === 'amount_discount') {
      return <Coins className="w-8 h-8 text-green-500" />;
    } else {
      return <Sparkles className="w-8 h-8 text-gray-400" />;
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-purple-600" />
              Scratch Cards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                disabled={otpSent}
              />
            </div>
            
            {!otpSent ? (
              <Button 
                onClick={sendOTP} 
                disabled={loading || !phone}
                className="w-full bg-purple-600 hover:bg-purple-700"
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
                  />
                </div>
                <Button 
                  onClick={verifyOTP} 
                  disabled={loading || !otp}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
                <Button 
                  onClick={() => setOtpSent(false)} 
                  variant="outline"
                  className="w-full"
                >
                  Resend OTP
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
              <Gift className="w-8 h-8 text-purple-600" />
              Your Scratch Cards
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Welcome back, {customerInfo?.customer_name}!
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {scratchSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
                <Gift className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {scratchSummary.unscratched_cards}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-yellow-600">
                  {scratchSummary.total_percentage_discount > 0 && 
                    `${scratchSummary.total_percentage_discount}% OFF`}
                  {scratchSummary.total_percentage_discount > 0 && scratchSummary.total_amount_discount > 0 && ' + '}
                  {scratchSummary.total_amount_discount > 0 && 
                    `Rs ${scratchSummary.total_amount_discount} OFF`}
                  {scratchSummary.total_percentage_discount === 0 && scratchSummary.total_amount_discount === 0 && 
                    'No savings yet'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scratched</CardTitle>
                <Clock className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {scratchSummary.scratched_cards}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scratch Cards */}
        {scratchSummary && scratchSummary.cards_data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scratchSummary.cards_data.map((card) => (
              <Card 
                key={card.id} 
                className={`shadow-xl transition-all duration-300 ${
                  card.is_scratched 
                    ? 'bg-gray-100 opacity-75' 
                    : 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 hover:scale-105 cursor-pointer'
                }`}
                onClick={() => !card.is_scratched && handleScratchCard(card.id)}
              >
                <CardHeader className="text-center">
                  <CardTitle className={`text-lg ${card.is_scratched ? 'text-gray-600' : 'text-white'}`}>
                    {card.is_scratched ? '🎫 Scratched Card' : '🎫 Scratch to Win!'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className={`text-2xl font-bold font-mono ${card.is_scratched ? 'text-gray-700' : 'text-white'}`}>
                    {card.code}
                  </div>
                  
                  {card.is_scratched && (
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-center mb-2">
                        {getPrizeIcon(card)}
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {getPrizeText(card)}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires: {new Date(card.expires_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  {!card.is_scratched && (
                    <div className="text-white text-sm">
                      Tap to scratch and reveal your prize!
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <Gift size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Scratch Cards Yet</h2>
            <p className="text-gray-600">
              You'll earn 1 scratch card for every Rs 150 you spend. Keep shopping to collect more cards!
            </p>
          </div>
        )}

        {/* Info */}
        <div className="bg-white rounded-2xl p-6 mt-6 shadow-2xl">
          <h3 className="text-lg font-bold text-gray-800 mb-3">How It Works</h3>
          <div className="space-y-2 text-gray-600">
            <p>• Earn 1 scratch card for every Rs 150 spent</p>
            <p>• Scratch cards to reveal prizes like discounts</p>
            <p>• Won prizes are valid for 1 hour after scratching</p>
            <p>• Use multiple prizes together for maximum savings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScratchCards;
