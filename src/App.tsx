
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Activity from "./pages/Activity";
import CustomerApp from "./pages/CustomerApp";
import CustomerDetails from "./pages/CustomerDetails";
import ScratchCards from "./pages/ScratchCards";
import ScratchCardPlay from "./pages/ScratchCardPlay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/customer" element={<CustomerApp />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />
            <Route path="/scratch-cards" element={<ScratchCards />} />
            <Route path="/play-scratch-cards" element={<ScratchCardPlay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
