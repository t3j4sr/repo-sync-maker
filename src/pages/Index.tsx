
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { CustomersList } from "@/components/CustomersList";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { AddPurchaseModal } from "@/components/AddPurchaseModal";
import { Button } from "@/components/ui/button";
import { Sparkles, Gift } from "lucide-react";
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
        showActivityLog={false}
      />

      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Scratch Cards Button - Very Prominent and Outside White Area */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-1 rounded-2xl shadow-2xl">
          <Button
            onClick={handleNavigateToScratchCards}
            className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white font-bold py-6 rounded-2xl shadow-2xl text-xl transform hover:scale-105 transition-all duration-200 border-4 border-yellow-300"
          >
            <Gift className="w-8 h-8 mr-3 animate-bounce" />
            🎰 LUCKY SCRATCH CARDS - TRY YOUR LUCK NOW! 🎉
            <Sparkles className="w-8 h-8 ml-3 animate-pulse" />
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-3xl min-h-[calc(100vh-320px)]">
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
