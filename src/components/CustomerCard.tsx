import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CustomerWithPurchases } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface CustomerCardProps {
  customer: CustomerWithPurchases;
  onAddPurchase: (customerId: string, customerName: string) => void;
}

export const CustomerCard = ({ customer, onAddPurchase }: CustomerCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/customer/${customer.id}`);
  };

  const handleAddPurchaseClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking the add button
    onAddPurchase(customer.id, customer.name);
  };

  const totalPurchases = customer.total_purchases || 0;

  return (
    <div 
      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-gray-200 text-gray-600 font-medium text-lg">
            {customer.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium text-gray-900 text-lg">{customer.name}</h3>
          <p className="text-sm text-gray-500">{customer.phone}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="font-semibold text-gray-900 text-lg">
            Rs {totalPurchases.toFixed(2)}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleAddPurchaseClick}
          className="bg-purple-600 hover:bg-purple-700 h-12 w-12 p-0 rounded-lg"
        >
          <Plus className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
};
