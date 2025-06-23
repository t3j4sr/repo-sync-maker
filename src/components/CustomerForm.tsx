
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerFormData } from "@/hooks/useCustomerCreation";

interface CustomerFormProps {
  formData: CustomerFormData;
  onFormDataChange: (data: CustomerFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
}

export const CustomerForm = ({ 
  formData, 
  onFormDataChange, 
  onSubmit, 
  onCancel, 
  loading 
}: CustomerFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Customer Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          placeholder="Enter customer name"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
          placeholder="+91 XXXXXXXXXX"
          required
        />
        <p className="text-xs text-gray-500">
          This phone number will be used to create a login account for the customer. They can login using OTP verification.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="amount">Initial Purchase Amount (Optional)</Label>
        <Input
          id="amount"
          type="number"
          value={formData.purchaseAmount}
          onChange={(e) => onFormDataChange({ ...formData, purchaseAmount: e.target.value })}
          placeholder="Enter amount in Rs"
          min="0"
          step="0.01"
        />
      </div>
      
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
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
          {loading ? "Adding..." : "Add Customer"}
        </Button>
      </div>
    </form>
  );
};
