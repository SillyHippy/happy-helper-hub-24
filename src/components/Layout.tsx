
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface LayoutProps {
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ className }) => {
  const location = useLocation();
  
  // Set CSS variables for mobile viewport height
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    
    // Set initial height
    setAppHeight();
    
    // Update on resize and orientation change
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main 
        className={cn(
          "flex-1 page-transition page-container pb-12 overflow-x-hidden overflow-y-auto overscroll-contain", 
          className
        )}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          height: 'var(--app-height, 100dvh)',
          maxHeight: 'calc(var(--app-height, 100dvh) - 56px)',
          transform: 'translate3d(0,0,0)',
          WebkitTransform: 'translate3d(0,0,0)',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
