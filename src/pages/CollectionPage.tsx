
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Clock, CheckCircle } from 'lucide-react';
import { useCustomerScratchCards } from '@/hooks/useCustomerScratchCards';
import CountdownTimer from '@/components/CountdownTimer';
import { toast } from 'sonner';

interface CustomerData {
  id: string;
  name: string;
  phone: string;
}

const CollectionPage = () => {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const navigate = useNavigate();

  const { scratchCards, loading, error, scratchCard, isCardExpired, getTimeRemaining, refetchCards } = useCustomerScratchCards(customer?.phone || '');

  useEffect(() => {
    loadCustomerData();
  }, []);

  // Refresh every 30 seconds to update card states and timers
  useEffect(() => {
    const interval = setInterval(() => {
      if (refetchCards) {
        refetchCards();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchCards]);

  const loadCustomerData = async () => {
    try {
      const storedCustomer = localStorage.getItem('customer');
      if (!storedCustomer) {
        navigate('/');
        return;
      }

      const customerData = JSON.parse(storedCustomer);
      setCustomer(customerData);
    } catch (err) {
      console.error('Error loading customer data:', err);
      navigate('/');
    }
  };

  const goBack = () => {
    navigate('/');
  };

  const getDiscountDisplay = (card: any) => {
    if (card.discount_type === 'better_luck') {
      return 'Better Luck Next Time!';
    }
    return `₹${card.discount_value} OFF`;
  };

  const handleCardReveal = async (cardId: string) => {
    if (!scratchCards) return;

    const card = scratchCards.scratch_cards.find(c => c.id === cardId);
    if (!card) {
      toast.error('Card not found');
      return;
    }

    if (card.is_scratched) {
      toast.error('This card has already been scratched');
      return;
    }

    console.log('Revealing card:', cardId);
    const success = await scratchCard(cardId);
    
    if (success) {
      // Wait a moment for the database to update, then refetch
      setTimeout(async () => {
        await refetchCards();
        console.log('Cards refetched after reveal');
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading your collection...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Please login to view your collection</div>
      </div>
    );
  }

  const cards = scratchCards?.scratch_cards || [];
  const activeCards = cards.filter(card => card.is_scratched && !isCardExpired(card));
  const expiredCards = cards.filter(card => card.is_scratched && isCardExpired(card));
  const unscatchedCards = cards.filter(card => !card.is_scratched);

  console.log('Collection page card counts:', {
    total: cards.length,
    active: activeCards.length,
    expired: expiredCards.length,
    unscratched: unscatchedCards.length
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800">
      {/* Header */}
      <div className="pt-8 pb-6 px-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-white hover:bg-white/10 mr-3"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <motion.h1 
              className="text-2xl font-bold text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {customer.name}'s Collection
            </motion.h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white/10 border-white/20 backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="text-2xl font-bold">{cards.length}</div>
                <div className="text-sm text-white/80">Total</div>
              </div>
            </Card>
            <Card className="p-4 bg-green-500/20 border-green-400/30 backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="text-2xl font-bold">{activeCards.length}</div>
                <div className="text-sm text-green-200">Active</div>
              </div>
            </Card>
            <Card className="p-4 bg-red-500/20 border-red-400/30 backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="text-2xl font-bold">{expiredCards.length}</div>
                <div className="text-sm text-red-200">Expired</div>
              </div>
            </Card>
            <Card className="p-4 bg-yellow-500/20 border-yellow-400/30 backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="text-2xl font-bold">{unscatchedCards.length}</div>
                <div className="text-sm text-yellow-200">Pending</div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {cards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Gift className="w-16 h-16 mx-auto mb-4 text-white/50" />
              <h2 className="text-xl font-semibold text-white mb-2">No Cards Yet</h2>
              <p className="text-white/80 mb-6">
                Start making purchases to earn your first scratch card!
              </p>
              <Button
                onClick={goBack}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold"
              >
                <Gift className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Active Cards */}
              {activeCards.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Active Discounts ({activeCards.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="p-4 bg-green-500/20 border-green-400/30 backdrop-blur-sm">
                          <div className="text-center text-white mb-4">
                            <div className="text-lg font-bold mb-2">✨ Active Discount</div>
                            <div className="bg-green-600/30 border border-green-400/50 rounded-lg p-3 mb-3">
                              <div className="text-green-100 font-semibold text-lg">
                                {getDiscountDisplay(card)}
                              </div>
                              {card.expires_at && (
                                <div className="mt-2">
                                  <CountdownTimer 
                                    expiresAt={card.expires_at}
                                    onExpire={() => refetchCards?.()}
                                  />
                                </div>
                              )}
                            </div>
                            <p className="text-green-200 text-sm">
                              Show this to the shopkeeper to claim your discount!
                            </p>
                          </div>
                          <div className="text-xs text-white/60 text-center">
                            <div>From: {card.shop_name}</div>
                            <div>Earned: {new Date(card.created_at).toLocaleDateString()}</div>
                            {card.scratched_at && (
                              <div>Scratched: {new Date(card.scratched_at).toLocaleString()}</div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unscratched Cards */}
              {unscatchedCards.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-yellow-400" />
                    Ready to Scratch ({unscatchedCards.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unscatchedCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="p-4 bg-yellow-500/20 border-yellow-400/30 backdrop-blur-sm">
                          <div className="text-center text-white mb-4">
                            <div className="text-lg font-bold mb-2">🎁 Scratch Card</div>
                            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
                              <div className="text-yellow-100 font-semibold">Ready to Scratch!</div>
                              <Button 
                                onClick={() => handleCardReveal(card.id)}
                                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black"
                                size="sm"
                                disabled={card.is_scratched}
                              >
                                Reveal Prize
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-white/60 text-center">
                            <div>From: {card.shop_name}</div>
                            <div>Earned: {new Date(card.created_at).toLocaleDateString()}</div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expired Cards */}
              {expiredCards.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-400" />
                    Expired Cards ({expiredCards.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {expiredCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="p-4 bg-red-500/20 border-red-400/30 backdrop-blur-sm opacity-75">
                          <div className="text-center text-white mb-4">
                            <div className="text-lg font-bold mb-2">⏰ Expired</div>
                            <div className="bg-red-600/30 border border-red-400/50 rounded-lg p-3">
                              <div className="text-red-100 font-semibold line-through">
                                {getDiscountDisplay(card)}
                              </div>
                              <div className="text-red-200 text-sm mt-1">
                                Expired on {card.expires_at ? new Date(card.expires_at).toLocaleString() : 'Unknown'}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-white/60 text-center">
                            <div>From: {card.shop_name}</div>
                            <div>Earned: {new Date(card.created_at).toLocaleDateString()}</div>
                            {card.scratched_at && (
                              <div>Scratched: {new Date(card.scratched_at).toLocaleString()}</div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionPage;
