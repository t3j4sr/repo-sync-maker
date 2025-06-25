
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Star, Trophy, Sparkles, RefreshCw } from "lucide-react";

interface ScratchCard {
  id: string;
  code: string;
  is_scratched: boolean;
  prize_type: string;
  prize_value: number;
  expires_at: string;
  customer_id: string;
}

const ScratchCardPlay = () => {
  const [searchParams] = useSearchParams();
  const [scratchCards, setScratchCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [scratchingCard, setScratchingCard] = useState<string | null>(null);
  const { toast } = useToast();
  
  const phone = searchParams.get('phone');

  useEffect(() => {
    if (phone) {
      fetchScratchCards();
    }
  }, [phone]);

  const fetchScratchCards = async () => {
    try {
      // First get customer by phone
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone?.replace('+91', ''))
        .single();

      if (customerError || !customer) {
        console.error('Customer not found:', customerError);
        toast({
          title: "Error",
          description: "Customer not found",
          variant: "destructive",
        });
        return;
      }

      // Get scratch cards for this customer
      const { data: cards, error: cardsError } = await supabase
        .from('scratch_cards')
        .select('*')
        .eq('customer_id', customer.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Error fetching cards:', cardsError);
        toast({
          title: "Error", 
          description: "Failed to load scratch cards",
          variant: "destructive",
        });
        return;
      }

      setScratchCards(cards || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScratch = async (cardId: string) => {
    setScratchingCard(cardId);
    
    try {
      const { error } = await supabase
        .from('scratch_cards')
        .update({ 
          is_scratched: true,
          scratched_at: new Date().toISOString() 
        })
        .eq('id', cardId);

      if (error) {
        console.error('Error scratching card:', error);
        toast({
          title: "Error",
          description: "Failed to scratch card",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setScratchCards(prev => 
        prev.map(card => 
          card.id === cardId 
            ? { ...card, is_scratched: true, scratched_at: new Date().toISOString() }
            : card
        )
      );

      // Show success message
      const card = scratchCards.find(c => c.id === cardId);
      if (card) {
        if (card.prize_type === 'better_luck') {
          toast({
            title: "Better Luck Next Time!",
            description: "Don't worry, more chances are coming your way! 🍀",
          });
        } else if (card.prize_type === 'percentage_discount') {
          toast({
            title: "🎉 Congratulations!",
            description: `You won ${card.prize_value}% discount on your next purchase!`,
          });
        } else if (card.prize_type === 'amount_discount') {
          toast({
            title: "🎉 Amazing!",
            description: `You won ₹${card.prize_value} off on your next purchase!`,
          });
        }
      }

    } catch (error) {
      console.error('Error scratching card:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setScratchingCard(null);
    }
  };

  const getPrizeDisplay = (card: ScratchCard) => {
    if (!card.is_scratched) return null;
    
    if (card.prize_type === 'better_luck') {
      return (
        <div className="text-center p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
          <div className="text-2xl mb-2">🍀</div>
          <div className="font-bold text-blue-800">Better Luck Next Time!</div>
          <div className="text-sm text-blue-600">Keep playing for more chances!</div>
        </div>
      );
    } else if (card.prize_type === 'percentage_discount') {
      return (
        <div className="text-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
          <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="font-bold text-green-800 text-xl">{card.prize_value}% OFF</div>
          <div className="text-sm text-green-600">On your next purchase!</div>
        </div>
      );
    } else if (card.prize_type === 'amount_discount') {
      return (
        <div className="text-center p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg">
          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="font-bold text-orange-800 text-xl">₹{card.prize_value} OFF</div>
          <div className="text-sm text-orange-600">On your next purchase!</div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading your scratch cards...</div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
        <div className="text-white text-xl">Invalid scratch card link</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600">
      {/* Header */}
      <div className="text-center py-8 text-white">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8" />
          <h1 className="text-4xl font-bold">Luck Draw</h1>
          <Sparkles className="w-8 h-8" />
        </div>
        <p className="text-xl opacity-90">Scratch & Win Amazing Prizes!</p>
      </div>

      {/* Cards Container */}
      <div className="px-4 pb-8">
        {scratchCards.length === 0 ? (
          <div className="text-center text-white">
            <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No Scratch Cards Available</h2>
            <p className="opacity-75">Either you don't have any cards or they have expired.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {scratchCards.map((card) => (
              <Card key={card.id} className="overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <CardContent className="p-0">
                  {/* Movie Ticket Style Header */}
                  <div className="bg-gradient-to-r from-gold-400 to-yellow-500 p-4 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpath d="M0 0h100v100H0z" fill="%23ffffff" opacity="0.1"/%3E%3Cpath d="M20 20h60v60H20z" fill="none" stroke="%23ffffff" stroke-width="1" opacity="0.3"/%3E%3C/svg%3E')] opacity-20"></div>
                    <div className="relative z-10">
                      <Gift className="w-8 h-8 text-white mx-auto mb-2" />
                      <h3 className="text-white font-bold text-lg">SCRATCH CARD</h3>
                      <div className="text-white/80 text-sm font-mono">{card.code}</div>
                    </div>
                    
                    {/* Ticket perforations */}
                    <div className="absolute -bottom-3 left-0 right-0 flex justify-center">
                      <div className="flex space-x-2">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="w-2 h-6 bg-white rounded-full"></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scratch Area */}
                  <div className="p-6">
                    {!card.is_scratched ? (
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg p-8 mb-4 relative overflow-hidden cursor-pointer group"
                             style={{
                               background: 'linear-gradient(45deg, #c0c0c0 25%, #silver 25%, #silver 50%, #c0c0c0 50%, #c0c0c0 75%, #silver 75%)',
                               backgroundSize: '20px 20px'
                             }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 group-hover:opacity-100 opacity-50 transition-opacity"></div>
                          <div className="relative z-10 text-gray-600">
                            <div className="text-4xl mb-2">🪙</div>
                            <div className="font-bold">SCRATCH HERE</div>
                            <div className="text-sm">Tap to reveal your prize!</div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleScratch(card.id)}
                          disabled={scratchingCard === card.id}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 text-lg"
                          size="lg"
                        >
                          {scratchingCard === card.id ? (
                            <>
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              Scratching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Scratch Now!
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="mb-4">
                          {getPrizeDisplay(card)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Scratched on {new Date(card.scratched_at || '').toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticket Bottom */}
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-3 text-center border-t border-dashed border-gray-300">
                    <div className="text-xs text-gray-600">
                      Expires: {new Date(card.expires_at).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-white/75 pb-8">
        <p className="text-sm">🍀 Good Luck & Have Fun! 🍀</p>
        <p className="text-xs mt-2">Powered by Luck Draw</p>
      </div>
    </div>
  );
};

export default ScratchCardPlay;
