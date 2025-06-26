
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
import { createPurchase } from "@/services/purchaseService";
import { useScratchCardService } from "@/services/scratchCardService";

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
  const { handleScratchCardsForPurchase } = useScratchCardService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const purchaseAmount = parseFloat(amount);
      const data = await createPurchase(customerId, purchaseAmount, user.id);

      // Generate scratch cards if purchase is >= 150 Rs
      if (purchaseAmount >= 150) {
        // Get customer phone number
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', customerId)
          .single();

        if (customerError) {
          console.error('Error fetching customer phone:', customerError);
        } else if (customerData?.phone) {
          const scratchResult = await handleScratchCardsForPurchase(
            customerId,
            customerName,
            customerData.phone,
            purchaseAmount
          );
          
          if (scratchResult.cardsGenerated > 0) {
            toast({
              title: "Purchase Added & Cards Generated!",
              description: `Added Rs ${amount} purchase for ${customerName}. ${scratchResult.cardsGenerated} new scratch card(s) generated and sent via SMS!`,
            });
          } else {
            toast({
              title: "Purchase Added",
              description: `Added Rs ${amount} purchase for ${customerName}`,
            });
          }
        }
      } else {
        toast({
          title: "Purchase Added",
          description: `Added Rs ${amount} purchase for ${customerName}`,
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
            amount: purchaseAmount
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
            <p className="text-sm text-gray-600">
              Note: Scratch cards are generated for purchases of Rs 150 or more
            </p>
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
