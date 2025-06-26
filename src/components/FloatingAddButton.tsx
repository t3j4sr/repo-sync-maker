
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton = ({ onClick }: FloatingAddButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-black hover:bg-gray-800 shadow-lg z-50"
      size="icon"
    >
      <Plus className="w-8 h-8 text-white" />
    </Button>
  );
};
