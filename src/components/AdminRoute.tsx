import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { Loader2, Shield, AlertTriangle } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requireSuperAdmin = false,
}) => {
  const { isAdmin, isSuperAdmin, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin panel. Please contact
            an administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Insufficient Permissions
          </h1>
          <p className="text-gray-600 mb-6">
            This section requires super admin privileges. Please contact a super
            administrator for access.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
