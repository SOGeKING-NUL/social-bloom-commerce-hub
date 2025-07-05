
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Layout from '@/components/Layout';
import UserDashboard from '@/components/dashboards/UserDashboard';
import VendorDashboard from '@/components/dashboards/VendorDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const DashboardContent = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      {profile.role === 'admin' && <AdminDashboard />}
      {profile.role === 'vendor' && <VendorDashboard />}
      {(profile.role === 'user' || !profile.role) && <UserDashboard />}
    </div>
  );

  return <Layout><DashboardContent /></Layout>;
};

export default Dashboard;
