
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ShopkeeperAuth } from "@/components/shopkeeper/ShopkeeperAuth";
import { ScratchCardsPage } from "@/components/ScratchCardsPage";
import Index from "./pages/Index";
import CustomerDetails from "./pages/CustomerDetails";
import Profile from "./pages/Profile";
import Activity from "./pages/Activity";
import CustomerApp from "./pages/CustomerApp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Check if user is a customer
  const isCustomer = user?.user_metadata?.isCustomer === true;

  if (!user) {
    return <ShopkeeperAuth />;
  }

  // If user is a customer, show customer app
  if (isCustomer) {
    return <CustomerApp />;
  }

  // For shopkeepers, show the main application with routing
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/customer/:id" element={<CustomerDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/scratch-cards" element={<ScratchCardsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
