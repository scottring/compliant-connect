import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { env } from "@/config/env";

const AuthDebug = () => {
  const { user, session, userCompanies, currentCompany, userRole, refreshUserData } = useAuth();

  // Only show in development mode
  if (!env.features.enableDebugTools) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded-lg max-w-sm opacity-70 hover:opacity-100 transition-opacity z-50">
      <h3 className="text-lg font-semibold mb-2">Auth Debug</h3>
      <div className="text-xs overflow-auto max-h-40">
        <p><strong>Auth State:</strong> {user ? "Authenticated" : "Not Authenticated"}</p>
        <p><strong>User ID:</strong> {user?.id || "None"}</p>
        <p><strong>Email:</strong> {user?.email || "None"}</p>
        <p><strong>Role:</strong> {userRole || "None"}</p>
        <p><strong>Profile:</strong> {user?.profile ? "Exists" : "Missing"}</p>
        <p><strong>Companies:</strong> {userCompanies?.length || 0}</p>
        <p><strong>Current Company:</strong> {currentCompany?.name || "None"}</p>
      </div>
      <div className="mt-2 flex justify-end">
        <Button 
          size="sm" 
          variant="outline" 
          className="text-xs bg-transparent border-white text-white" 
          onClick={refreshUserData}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default AuthDebug; 