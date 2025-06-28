
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    if (!user || !amount) return;

    setLoading(true);
    try {
      const purchaseAmount = parseFloat(amount);
      
      if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid purchase amount",
          variant: "destructive",
        });
        return;
      }

      console.log('Adding purchase:', { customerId, amount: purchaseAmount, userId: user.id });
      
      // Create purchase
      const purchase = await createPurchase(customerId, purchaseAmount, user.id);
      console.log('Purchase created:', purchase);

      // If purchase amount > 150, handle scratch cards
      if (purchaseAmount > 150) {
        try {
          // Get customer phone from customers table
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('phone')
            .eq('id', customerId)
            .single();

          if (customerError) {
            console.error('Error fetching customer phone:', customerError);
          } else if (customer) {
            const scratchResult = await handleScratchCardsForPurchase(
              customerId,
              customerName,
              customer.phone,
              purchaseAmount
            );

            if (scratchResult.cardsGenerated > 0) {
              toast({
                title: "Purchase Added & Scratch Cards Generated!",
                description: `Purchase of Rs ${amount} added and ${scratchResult.cardsGenerated} scratch card(s) sent to ${customerName}`,
              });
            } else {
              toast({
                title: "Purchase Added",
                description: `Purchase of Rs ${amount} added for ${customerName}`,
              });
            }
          }
        } catch (scratchError) {
          console.error('Error with scratch cards:', scratchError);
          toast({
            title: "Purchase Added",
            description: `Purchase of Rs ${amount} added for ${customerName} (scratch cards had an issue)`,
          });
        }
      } else {
        toast({
          title: "Purchase Added",
          description: `Purchase of Rs ${amount} added for ${customerName}`,
        });
      }

      // Log the activity
      try {
        await logActivity(
          'purchase_added',
          'purchase',
          purchase.id,
          `Added purchase of Rs ${amount} for ${customerName}`,
          { 
            customer_id: customerId,
            customer_name: customerName,
            amount: purchaseAmount,
            eligible_customer: purchaseAmount > 150
          }
        );
      } catch (activityError) {
        console.error('Error logging purchase activity:', activityError);
      }

      setAmount("");
      onOpenChange(false);
      onPurchaseAdded();
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast({
        title: "Error",
        description: `Failed to add purchase: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setAmount("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Purchase for {customerName}</DialogTitle>
          <DialogDescription>
            Add a new purchase amount for this customer.
          </DialogDescription>
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
              min="0"
              step="0.01"
              required
            />
            <p className="text-xs text-gray-500">
              Purchases over Rs 150 will generate scratch cards and be eligible for rewards.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
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
