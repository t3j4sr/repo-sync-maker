
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, Activity } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface HeaderProps {
  onToggleActivityLog: () => void;
  onNavigateToProfile: () => void;
  showActivityLog: boolean;
}

export const Header = ({ onNavigateToProfile }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const shouldShowBackButton = location.pathname !== '/';

  return (
    <div className="flex items-center justify-between p-4 text-white">
      <div className="flex items-center gap-4">
        {shouldShowBackButton && (
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-2xl font-bold">Luck Draw</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => navigate('/activity')}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <Activity className="w-5 h-5 mr-2" />
          Activity
        </Button>
        <Button
          onClick={onNavigateToProfile}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <User className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
