// Import the existing dependencies and components
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  Clock, 
  Plus, 
  Menu, 
  X, 
  FileSpreadsheet 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

const getLinkClass = ({ isActive }: { isActive: boolean }) => {
  return cn(
    "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary hover:text-accent-foreground focus:bg-secondary focus:text-accent-foreground",
    isActive ? "bg-secondary text-accent-foreground" : "text-muted-foreground"
  );
};

const getMobileLinkClass = ({ isActive }: { isActive: boolean }) => {
  return cn(
    "flex w-full items-center space-x-2 rounded-md p-2 hover:bg-secondary hover:text-accent-foreground focus:bg-secondary focus:text-accent-foreground",
    isActive ? "bg-secondary text-accent-foreground" : "text-muted-foreground"
  );
};

export const Header = ({ className }: HeaderProps) => {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <header
      className={cn("sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", 
      className)}
    >
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <NavLink to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">ServeTracker</span>
          </NavLink>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <NavLink to="/" className={getLinkClass}>
              <Home className="h-4 w-4 mr-1" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/clients" className={getLinkClass}>
              <Users className="h-4 w-4 mr-1" />
              <span>Clients</span>
            </NavLink>
            <NavLink to="/history" className={getLinkClass}>
              <Clock className="h-4 w-4 mr-1" />
              <span>History</span>
            </NavLink>
            <NavLink to="/export" className={getLinkClass}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              <span>Export</span>
            </NavLink>
          </nav>
        </div>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          onClick={toggleMobileMenu}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* <SearchBar /> */}
          </div>
          <nav className="flex items-center">
            <NavLink to="/new-serve">
              <Button variant="default" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Serve
              </Button>
            </NavLink>
          </nav>
        </div>
      </div>
      
      {showMobileMenu && (
        <div className="fixed inset-0 top-14 z-50 grid h-[calc(100vh-3.5rem)] grid-flow-row auto-rows-max overflow-auto p-6 pb-32 shadow-md animate-in slide-in-from-bottom-80 md:hidden">
          <div className="relative z-20 grid gap-6 rounded-md bg-background p-4 shadow-md">
            <NavLink
              to="/"
              className="flex items-center space-x-2"
              onClick={toggleMobileMenu}
            >
              <span className="font-bold">ServeTracker</span>
            </NavLink>
            <nav className="grid grid-flow-row auto-rows-max text-sm">
              <NavLink
                to="/"
                className={getMobileLinkClass}
                onClick={toggleMobileMenu}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </NavLink>
              <NavLink
                to="/clients"
                className={getMobileLinkClass}
                onClick={toggleMobileMenu}
              >
                <Users className="h-4 w-4 mr-2" />
                Clients
              </NavLink>
              <NavLink
                to="/history"
                className={getMobileLinkClass}
                onClick={toggleMobileMenu}
              >
                <Clock className="h-4 w-4 mr-2" />
                History
              </NavLink>
              <NavLink
                to="/export"
                className={getMobileLinkClass}
                onClick={toggleMobileMenu}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Data
              </NavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
