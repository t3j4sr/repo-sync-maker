
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useToast } from "@/hooks/use-toast";
import { useScratchCards } from "@/hooks/useScratchCards";

interface AddPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onPurchaseAdded: () => void;
}

export const AddPurchaseModal = ({ 
  open, 
  onOpenChange, 
  customerId, 
  customerName,
  onPurchaseAdded 
}: AddPurchaseModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const { toast } = useToast();
  const { generateScratchCards } = useScratchCards();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      console.log('Adding purchase:', { customerId, amount, userId: user.id });
      
      const { data, error } = await supabase
        .from('purchases')
        .insert([
          {
            customer_id: customerId,
            amount: parseFloat(amount),
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding purchase:', error);
        throw error;
      }

      console.log('Purchase added successfully:', data);

      // Generate scratch cards for the customer after adding purchase
      try {
        const newCardsCount = await generateScratchCards(customerId);
        if (newCardsCount > 0) {
          toast({
            title: "Purchase Added & Cards Generated!",
            description: `Added Rs ${amount} purchase for ${customerName}. ${newCardsCount} new scratch card(s) generated!`,
          });
        } else {
          toast({
            title: "Purchase Added",
            description: `Added Rs ${amount} purchase for ${customerName}`,
          });
        }
      } catch (scratchError) {
        console.error('Error generating scratch cards:', scratchError);
        toast({
          title: "Purchase Added",
          description: `Added Rs ${amount} purchase for ${customerName}. Scratch cards will be generated shortly.`,
        });
      }

      // Log the activity with the actual purchase data
      try {
        await logActivity(
          'purchase_added',
          'purchase',
          data.id,
          `Added purchase of Rs ${amount} for ${customerName}`,
          { 
            customer_id: customerId,
            customer_name: customerName,
            amount: parseFloat(amount)
          }
        );
        console.log('Activity logged successfully');
      } catch (activityError) {
        console.error('Error logging activity:', activityError);
      }

      setAmount("");
      onOpenChange(false);
      onPurchaseAdded();
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast({
        title: "Error",
        description: "Failed to add purchase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Purchase for {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Purchase Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in Rs"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
