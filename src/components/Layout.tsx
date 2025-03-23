
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Briefcase, Upload, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  
  const navItems = [
    { name: 'Clients', path: '/clients', icon: <User size={20} /> },
    { name: 'Cases', path: '/cases', icon: <Briefcase size={20} /> },
    { name: 'Serve', path: '/serve', icon: <Upload size={20} /> },
  ];
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar for desktop */}
      <aside 
        className={cn(
          "w-64 bg-white shadow-md z-30 transition-all duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0 transform" : "relative",
          isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-lg font-semibold text-primary">ServeTracker Pro</h1>
          </div>
          
          <nav className="flex-1 pt-4 pb-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm transition-colors hover:bg-secondary rounded-md mx-2",
                      location.pathname.startsWith(item.path) ? "bg-primary/10 text-primary font-medium" : "text-gray-600"
                    )}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t">
            <Link 
              to="/search" 
              className="flex items-center justify-center w-full px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <Search size={16} className="mr-2" />
              Search Cases
            </Link>
          </div>
        </div>
      </aside>
      
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 px-4 border-b bg-white shadow-sm flex items-center justify-between">
          {isMobile && (
            <button onClick={toggleSidebar} className="p-2 text-gray-600">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
          
          <div className={cn(isMobile ? "mx-auto" : "ml-4")}>
            <h1 className="text-lg font-medium">
              {location.pathname.startsWith('/clients') && 'Clients'}
              {location.pathname.startsWith('/cases') && 'Cases'}
              {location.pathname.startsWith('/serve') && 'Service Attempts'}
              {location.pathname.startsWith('/search') && 'Search'}
              {location.pathname === '/' && 'Dashboard'}
            </h1>
          </div>
          
          <div className="w-10"> {/* Placeholder for balance */}
          </div>
        </header>
        
        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
