
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ className }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main 
        className={cn(
          "flex-1 page-transition pb-20", 
          isMobile ? "page-container-mobile px-3" : "page-container",
          className
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
