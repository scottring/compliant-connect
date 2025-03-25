import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LockIcon, HomeIcon } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 mb-4 text-red-500 bg-red-100 rounded-full">
            <LockIcon size={32} />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            variant="default"
            onClick={() => navigate("/dashboard")}
            className="w-full"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized; 