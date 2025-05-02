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
    <div className="flex h-screen bg-neutral-100 relative md:pl-48">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-white shadow-md rounded-full h-10 w-10 flex items-center justify-center"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out z-40 md:hidden ${sidebarOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar - hidden on mobile unless toggled, fixed positioning regardless of screen size */}
      <div className={`${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'} md:translate-x-0 md:shadow-none transition-all duration-300 ease-in-out fixed md:fixed inset-y-0 left-0 z-40 h-full`}>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main content - not using md:pl-64 anymore, instead using w-full */}
      <div className="flex-1 flex flex-col overflow-y-auto w-full max-w-full">
        <Header />
        <div className="flex-1 overflow-y-auto pb-16 w-full max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
