
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { CustomersList } from "@/components/CustomersList";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { AddPurchaseModal } from "@/components/AddPurchaseModal";
import { useCustomers } from "@/hooks/useCustomers";
import { useCustomerFiltering } from "@/hooks/useCustomerFiltering";

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    customerId: string;
    customerName: string;
  }>({
    open: false,
    customerId: "",
    customerName: "",
  });
  
  const { customers, loading, fetchCustomers } = useCustomers();
  const { filteredCustomers } = useCustomerFiltering(customers, searchQuery);

  const handleAddPurchase = (customerId: string, customerName: string) => {
    setPurchaseModal({
      open: true,
      customerId,
      customerName,
    });
  };

  const handleNavigateToProfile = () => {
    navigate('/profile');
  };

  const handleNavigateToActivity = () => {
    navigate('/activity');
  };

  const handleNavigateToScratchCards = () => {
    navigate('/scratch-cards');
  };

  const handleCustomerAdded = async () => {
    await fetchCustomers();
  };

  const handlePurchaseAdded = async () => {
    await fetchCustomers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      <Header 
        onToggleActivityLog={handleNavigateToActivity}
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToScratchCards={handleNavigateToScratchCards}
        showActivityLog={false}
      />

      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 bg-white rounded-t-3xl min-h-[calc(100vh-200px)]">
        <div className="p-4">
          <CustomersList 
            showActivityLog={false}
            groupedCustomers={{ today: [], yesterday: [], older: filteredCustomers }}
            filteredCustomers={filteredCustomers}
            customers={customers}
            onAddPurchase={handleAddPurchase}
          />
        </div>
      </div>

      <FloatingAddButton onClick={() => setIsAddModalOpen(true)} />

      <AddCustomerModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        onCustomerAdded={handleCustomerAdded}
      />

      <AddPurchaseModal
        open={purchaseModal.open}
        onOpenChange={(open) => setPurchaseModal({ ...purchaseModal, open })}
        customerId={purchaseModal.customerId}
        customerName={purchaseModal.customerName}
        onPurchaseAdded={handlePurchaseAdded}
      />
    </div>
  );
};

export default Index;
