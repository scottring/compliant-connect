
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-3xl text-center">
        <img 
          src="/lovable-uploads/f586003e-96bf-4fc9-a319-a23ea3f422f8.png" 
          alt="StacksData Logo" 
          className="h-16 mx-auto mb-6"
        />
        
        <h1 className="text-4xl font-bold tracking-tight mb-3 text-gray-900">
          Product Compliance Management Platform
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Streamline the process of collecting, managing, and tracking product compliance 
          information between companies and their suppliers.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="px-8"
          >
            Go to Dashboard
          </Button>
          
          <Button 
            size="lg"
            variant="outline"
            onClick={() => navigate("/suppliers")}
            className="px-8"
          >
            Manage Suppliers
          </Button>
        </div>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {[
          {
            title: "Question Bank",
            description: "Create and organize compliance questions with tags for different regulations.",
            action: () => navigate("/question-bank")
          },
          {
            title: "Product Sheets",
            description: "Collect and review compliance information for specific products.",
            action: () => navigate("/product-sheets")
          },
          {
            title: "Tags & Categories",
            description: "Organize compliance requirements by regulatory frameworks.",
            action: () => navigate("/tags")
          }
        ].map((feature, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
            <p className="text-gray-600 mb-4">{feature.description}</p>
            <Button 
              variant="ghost" 
              onClick={feature.action}
              className="text-brand-600 hover:text-brand-700"
            >
              Explore &rarr;
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
