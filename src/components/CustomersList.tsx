
import { CustomerSection } from "@/components/CustomerSection";
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
  groupedCustomers, 
  filteredCustomers, 
  customers, 
  onAddPurchase 
}: CustomersListProps) => {
  return (
    <>
      <CustomerSection 
        title="Today"
        customers={groupedCustomers.today}
        onAddPurchase={onAddPurchase}
      />
      
      <CustomerSection 
        title="Yesterday"
        customers={groupedCustomers.yesterday}
        onAddPurchase={onAddPurchase}
      />
      
      <CustomerSection 
        title="Earlier"
        customers={groupedCustomers.older}
        onAddPurchase={onAddPurchase}
      />

      {filteredCustomers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {customers.length === 0 ? "No customers yet. Add your first customer!" : "No customers found"}
        </div>
      )}
    </>
  );
};
