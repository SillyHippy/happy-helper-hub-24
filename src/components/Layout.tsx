
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface LayoutProps {
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ className }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main 
        className={cn(
          "flex-1 page-transition page-container pb-20", 
          className
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
