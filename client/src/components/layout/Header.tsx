import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NewDealModal from "@/components/deals/NewDealModal";
import { Plus, Search } from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

export default function Header() {
  const [location] = useLocation();
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);

  // Get the page title based on the current location
  const getPageTitle = () => {
    const pathMap: Record<string, string> = {
      "/": "Dashboard",
      "/pipeline": "Pipeline",
      "/leaderboard": "Deal Leaderboard",
      "/funds": "Funds",
      "/settings": "Settings",
      "/users": "Users"
    };

    // Check if the path starts with /deals/
    if (location.startsWith("/deals/")) {
      return "Deal Details";
    }

    return pathMap[location] || "Not Found";
  };

  return (
    <header className="bg-white shadow-sm z-20 relative">
      <div className="px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-800">{getPageTitle()}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Search deals, funds..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent w-64" 
            />
          </div>
          
          <Button 
            onClick={() => setIsNewDealModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Deal
          </Button>
          
          <div className="relative">
            <NotificationDropdown />
          </div>
        </div>
      </div>

      {/* New Deal Modal */}
      <NewDealModal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
      />
    </header>
  );
}
