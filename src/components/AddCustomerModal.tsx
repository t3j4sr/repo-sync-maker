
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerForm } from "@/components/CustomerForm";
import { useCustomerCreation, CustomerFormData } from "@/hooks/useCustomerCreation";

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerAdded: () => void;
}

export const AddCustomerModal = ({ open, onOpenChange, onCustomerAdded }: AddCustomerModalProps) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    phone: "",
    purchaseAmount: ""
  });
  
  const { loading, createCustomer } = useCustomerCreation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createCustomer(formData, () => {
      setFormData({ name: "", phone: "", purchaseAmount: "" });
      onOpenChange(false);
      onCustomerAdded();
    });
  };

  const handleCancel = () => {
    setFormData({ name: "", phone: "", purchaseAmount: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <CustomerForm
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
};
