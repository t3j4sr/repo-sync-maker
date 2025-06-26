
import { CustomerCard } from "@/components/CustomerCard";
import { CustomerWithPurchases } from "@/lib/supabase";

interface CustomersListProps {
  showActivityLog: boolean;
  groupedCustomers: {
    today: CustomerWithPurchases[];
    yesterday: CustomerWithPurchases[];
    older: CustomerWithPurchases[];
  };
  filteredCustomers: CustomerWithPurchases[];
  customers: CustomerWithPurchases[];
  onAddPurchase: (customerId: string, customerName: string) => void;
}

export const CustomersList = ({ 
  filteredCustomers, 
  customers, 
  onAddPurchase 
}: CustomersListProps) => {
  const displayCustomers = filteredCustomers.length > 0 ? filteredCustomers : customers;

  if (displayCustomers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg font-medium">No customers yet</p>
        <p className="text-sm">Add your first customer using the + button below</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-gray-500 font-medium text-sm">Earlier</h2>
      <div className="space-y-3">
        {displayCustomers.map((customer) => (
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
