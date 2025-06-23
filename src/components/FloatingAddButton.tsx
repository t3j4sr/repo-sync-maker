
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton = ({ onClick }: FloatingAddButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black hover:bg-gray-800 shadow-lg"
      size="icon"
    >
      <Plus className="w-6 h-6 text-white" />
    </Button>
  );
};
