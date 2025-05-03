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
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-white shadow-sm hover:shadow-md rounded-full h-9 w-9 flex items-center justify-center transition-all duration-200"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out z-40 md:hidden ${sidebarOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar - hidden on mobile unless toggled, fixed positioning regardless of screen size */}
      <div className={`${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'} md:translate-x-0 md:shadow-none transition-all duration-300 ease-in-out fixed md:fixed inset-y-0 left-0 z-40 h-full`}>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-y-auto w-full max-w-full">
        <Header />
        <div className="flex-1 overflow-y-auto pb-16 w-full max-w-full">
          <main className="pt-2 sm:pt-4 px-2 sm:px-4 md:px-6 w-full overflow-hidden"> {/* Improved responsive padding */}
            <div className="w-full overflow-hidden">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
