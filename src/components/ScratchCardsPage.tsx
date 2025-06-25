
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScratchCard {
  id: string;
  code: string;
  is_scratched: boolean;
  scratched_at: string | null;
  created_at: string;
}

interface ScratchCardsPageProps {
  onBack: () => void;
}

export const ScratchCardsPage = ({ onBack }: ScratchCardsPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scratchCards, setScratchCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.phone) {
      fetchScratchCards();
    }
  }, [user]);

  const fetchScratchCards = async () => {
    if (!user?.phone) return;

    try {
      setLoading(true);
      
      // Get customer details first
      const { data: customerInfo, error: customerError } = await supabase.rpc(
        'verify_customer_login',
        { p_phone: user.phone }
      );

      if (customerError || !customerInfo || customerInfo.length === 0) {
        console.error('Error fetching customer data:', customerError);
        return;
      }

      const customer = customerInfo[0];

      // Get scratch cards for this customer
      const { data: cards, error: cardsError } = await supabase
        .from('scratch_cards')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Error fetching scratch cards:', cardsError);
        toast({
          title: "Error",
          description: "Failed to load your scratch cards",
          variant: "destructive",
        });
        return;
      }

      setScratchCards(cards || []);

    } catch (error) {
      console.error('Error in fetchScratchCards:', error);
      toast({
        title: "Error",
        description: "Failed to load scratch cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading your scratch cards...</div>
      </div>
    );
  }

  const unscratched = scratchCards.filter(card => !card.is_scratched);
  const scratched = scratchCards.filter(card => card.is_scratched);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <Button 
              onClick={onBack}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Scratch Cards</h1>
              <p className="text-gray-600">Your lucky draw entries</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scratchCards.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
              <Gift className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{unscratched.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used Cards</CardTitle>
              <Gift className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{scratched.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Scratch Cards */}
        {unscratched.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white text-xl font-bold mb-4">🎁 Active Scratch Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unscratched.map((card) => (
                <Card key={card.id} className="bg-gradient-to-br from-gold-400 to-gold-600 shadow-xl border-2 border-gold-300">
                  <CardHeader className="text-center">
                    <CardTitle className="text-white text-lg">🎫 Lucky Draw Card</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="text-2xl font-bold text-gray-800 font-mono">
                        {card.code}
                      </div>
                    </div>
                    <div className="text-white text-sm flex items-center justify-center gap-2">
                      <Calendar size={14} />
                      Earned: {new Date(card.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Used Scratch Cards */}
        {scratched.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white text-xl font-bold mb-4">📝 Used Scratch Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scratched.map((card) => (
                <Card key={card.id} className="bg-gray-400 shadow-xl opacity-75">
                  <CardHeader className="text-center">
                    <CardTitle className="text-white text-lg">🎫 Used Card</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="text-2xl font-bold text-gray-500 font-mono">
                        {card.code}
                      </div>
                    </div>
                    <div className="text-white text-sm">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Calendar size={14} />
                        Earned: {new Date(card.created_at).toLocaleDateString()}
                      </div>
                      {card.scratched_at && (
                        <div className="text-xs opacity-75">
                          Used: {new Date(card.scratched_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Cards Message */}
        {scratchCards.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <Gift size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Scratch Cards Yet</h2>
            <p className="text-gray-600">
              You'll earn 1 scratch card for every Rs 150 you spend. Keep shopping to collect more cards and enter the lucky draw!
            </p>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-gray-800 mb-3">How It Works</h3>
          <div className="space-y-2 text-gray-600">
            <p>• Earn 1 scratch card for every Rs 150 spent</p>
            <p>• Each card gives you an entry in the lucky draw</p>
            <p>• More cards = better chances of winning</p>
            <p>• Winners will be announced during special events</p>
          </div>
        </div>
      </div>
    </div>
  );
};
