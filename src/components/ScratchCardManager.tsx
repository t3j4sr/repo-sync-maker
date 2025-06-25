
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Gift, Send, RefreshCw } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export const ScratchCardManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [numberOfCards, setNumberOfCards] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const generateRandomCode = () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  const generatePrize = () => {
    const rand = Math.random();
    if (rand < 0.1) return { type: 'percentage_discount', value: 30 };
    if (rand < 0.2) return { type: 'percentage_discount', value: 20 };
    if (rand < 0.3) return { type: 'amount_discount', value: 50 };
    if (rand < 0.4) return { type: 'amount_discount', value: 30 };
    return { type: 'better_luck', value: 0 };
  };

  const handleGenerateAndSend = async () => {
    if (!selectedCustomerId || !user) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const codes: string[] = [];

    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      if (!selectedCustomer) throw new Error('Customer not found');

      // Generate scratch cards
      for (let i = 0; i < numberOfCards; i++) {
        const code = generateRandomCode();
        const prize = generatePrize();
        codes.push(code);

        // Store in database
        const { error } = await supabase
          .from('scratch_cards')
          .insert({
            customer_id: selectedCustomerId,
            code: code,
            prize_type: prize.type,
            prize_value: prize.value,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
          });

        if (error) {
          console.error('Error storing scratch card:', error);
        }
      }

      setGeneratedCodes(codes);

      // Send SMS
      try {
        const { data, error } = await supabase.functions.invoke('send-scratch-card-sms', {
          body: {
            phone: selectedCustomer.phone,
            customerName: selectedCustomer.name,
            cardsCount: numberOfCards,
            totalPurchase: 0 // Manual sending, no purchase amount
          }
        });

        if (error) throw error;

        if (data?.error) {
          toast({
            title: "Cards Generated",
            description: `${numberOfCards} scratch cards created but SMS failed to send`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success!",
            description: `${numberOfCards} scratch cards sent to ${selectedCustomer.name}`,
          });
        }
      } catch (smsError) {
        console.error('SMS Error:', smsError);
        toast({
          title: "Cards Generated",
          description: `${numberOfCards} scratch cards created but SMS failed to send`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error generating scratch cards:', error);
      toast({
        title: "Error",
        description: "Failed to generate scratch cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Send Scratch Cards to Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Customer</label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Number of Cards</label>
            <Input
              type="number"
              min="1"
              max="10"
              value={numberOfCards}
              onChange={(e) => setNumberOfCards(parseInt(e.target.value) || 1)}
              placeholder="Enter number of cards"
            />
          </div>

          <Button 
            onClick={handleGenerateAndSend} 
            disabled={loading || !selectedCustomerId}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating & Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate & Send Scratch Cards
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {generatedCodes.map((code, index) => (
                <div key={index} className="bg-gray-100 p-2 rounded text-center font-mono">
                  {code}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
