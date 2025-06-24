
import React, { useState, useEffect } from 'react';
import { ScratchCard } from './ScratchCard';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, RotateCcw, Sparkles } from "lucide-react";
import { useScratchCards } from "@/hooks/useScratchCards";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const REWARDS = [
  "10% OFF Next Purchase",
  "Free Shipping",
  "20% Discount Code",
  "Buy 1 Get 1 Free",
  "₹50 Cash Back",
  "15% OFF Everything",
  "Free Premium Upgrade",
  "₹100 Store Credit"
];

export const ScratchCardsPage = () => {
  const [currentReward, setCurrentReward] = useState('');
  const [revealedReward, setRevealedReward] = useState('');
  const [cardKey, setCardKey] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    generateNewReward();
  }, []);

  const generateNewReward = () => {
    const randomReward = REWARDS[Math.floor(Math.random() * REWARDS.length)];
    setCurrentReward(randomReward);
    setRevealedReward('');
    setCardKey(prev => prev + 1);
  };

  const handleRewardRevealed = (reward: string) => {
    setRevealedReward(reward);
  };

  const handleSendSMS = async (phone: string, reward: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-reward-sms', {
        body: {
          phone: phone,
          reward: reward,
          customerName: user?.user_metadata?.name || 'Customer'
        }
      });

      if (error) {
        console.error('SMS Error:', error);
        throw new Error(error.message || 'Failed to send SMS');
      }

      console.log('SMS sent successfully:', data);
    } catch (error) {
      console.error('Error sending reward SMS:', error);
      throw error;
    }
  };

  const handleNewCard = () => {
    generateNewReward();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white py-6">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-3xl font-bold mb-2">Lucky Scratch Cards</h1>
          <p className="text-purple-200">Scratch to reveal amazing rewards!</p>
        </div>

        {/* Scratch Card */}
        <ScratchCard
          key={cardKey}
          reward={currentReward}
          onRewardRevealed={handleRewardRevealed}
          onSendSMS={handleSendSMS}
        />

        {/* New Card Button */}
        <div className="text-center">
          <Button
            onClick={handleNewCard}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Get New Card
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="bg-white/10 border-white/20 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gift className="w-5 h-5" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-purple-100">
            <p>1. Scratch the silver area with your finger or mouse</p>
            <p>2. Reveal your hidden reward underneath</p>
            <p>3. Enter your phone number to receive the reward via SMS</p>
            <p>4. Get a new card and try again!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
