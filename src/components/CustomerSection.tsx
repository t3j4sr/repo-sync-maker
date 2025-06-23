
import { CustomerCard } from "@/components/CustomerCard";
import { CustomerWithPurchases } from "@/lib/supabase";

interface CustomerSectionProps {
  title: string;
  customers: CustomerWithPurchases[];
  onAddPurchase: (customerId: string, customerName: string) => void;
}

export const CustomerSection = ({ title, customers, onAddPurchase }: CustomerSectionProps) => {
  if (customers.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-gray-500 font-medium mb-4 text-sm">{title}</h2>
      <div className="space-y-3">
        {customers.map((customer) => (
          <CustomerCard 
            key={customer.id} 
            customer={customer} 
            onAddPurchase={onAddPurchase}
          />
        ))}
      </div>
    </div>
  );
};
