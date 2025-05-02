import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-100 relative">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-white shadow-md rounded-full h-10 w-10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu />
        </Button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out md:static fixed inset-y-0 left-0 z-40`}>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto md:pl-64">
        <Header />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
