
import { useAuth } from "@/hooks/useAuth";
import { CustomerAuthForm } from "@/components/CustomerAuthForm";
import { CustomerDashboard } from "@/components/CustomerDashboard";

const CustomerApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Check if user is a customer (has isCustomer metadata)
  const isCustomer = user?.user_metadata?.isCustomer === true;

  if (!user || !isCustomer) {
    return <CustomerAuthForm />;
  }

  return <CustomerDashboard />;
};

export default CustomerApp;
