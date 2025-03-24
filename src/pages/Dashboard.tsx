
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Users, 
  Camera, 
  ClipboardList, 
  ArrowRight, 
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { ServeAttemptData } from "@/components/ServeAttempt";
import { ClientData } from "@/components/ClientForm";
import ServeHistory from "@/components/ServeHistory";
import { useState, useEffect } from "react";
import EditServeDialog from "@/components/EditServeDialog";
import { updateServeAttempt, syncSupabaseServesToLocal } from "@/lib/supabase";

interface DashboardProps {
  clients: ClientData[];
  serves: ServeAttemptData[];
}

const Dashboard: React.FC<DashboardProps> = ({ clients, serves }) => {
  const [localServes, setLocalServes] = useState<ServeAttemptData[]>(serves);
  const [editingServe, setEditingServe] = useState<ServeAttemptData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Update local serves when props change
  useEffect(() => {
    setLocalServes(serves);
  }, [serves]);

  // Get recent serves by sorting based on timestamp
  const recentServes = [...localServes].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 3);

  const completedServes = localServes.filter(serve => serve.status === "completed").length;
  const pendingServes = localServes.filter(serve => serve.status === "failed").length;
  
  const today = new Date();
  const todayServes = localServes.filter(serve => {
    const serveDate = new Date(serve.timestamp);
    return serveDate.toDateString() === today.toDateString();
  }).length;

  // Handle edit serve
  const handleEditServe = (serve: ServeAttemptData) => {
    console.log("Opening edit dialog for serve:", serve);
    setEditingServe(serve);
    setEditDialogOpen(true);
  };

  // Handle save edited serve
  const handleSaveServe = async (updatedServe: ServeAttemptData) => {
    console.log("Dashboard: Saving updated serve:", updatedServe);
    try {
      // Update using the supabase utility function
      const result = await updateServeAttempt(updatedServe);
      
      if (result.success) {
        console.log("Dashboard: Successfully updated serve in Supabase");
        
        // Update local state
        setLocalServes(prevServes => 
          prevServes.map(serve => 
            serve.id === updatedServe.id ? updatedServe : serve
          )
        );
        
        // Force a sync to ensure all data is updated
        await syncSupabaseServesToLocal();
        
        return true;
      } else {
        console.error("Dashboard: Failed to update serve:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Dashboard: Error updating serve:", error);
      return false;
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Process Server Dashboard</h1>
        <p className="text-muted-foreground">
          Track your serve attempts, manage clients, and send documentation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Clients</p>
                <h2 className="text-3xl font-bold mt-1">{clients.length}</h2>
              </div>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <Link to="/clients">
              <Button variant="ghost" className="w-full mt-4 text-xs">
                Manage Clients <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Today's Activity</p>
                <h2 className="text-3xl font-bold mt-1">{todayServes}</h2>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="h-1 w-full bg-muted mt-4 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${Math.min(todayServes * 10, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {todayServes === 0 
                ? "No serves today" 
                : `${todayServes} serve ${todayServes === 1 ? 'attempt' : 'attempts'} today`}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Serve Status</p>
                <h2 className="text-3xl font-bold mt-1">{localServes.length}</h2>
              </div>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="flex-1 flex items-center gap-1.5 rounded-md bg-green-500/10 text-green-700 p-2 text-xs">
                <CheckCircle className="h-3.5 w-3.5" />
                {completedServes} Completed
              </div>
              <div className="flex-1 flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-700 p-2 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                {pendingServes} Pending
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-tight">Recent Serve Activity</h2>
            <Link to="/history">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {localServes.length > 0 ? (
            <ServeHistory 
              serves={recentServes} 
              clients={clients} 
              onEdit={handleEditServe}
            />
          ) : (
            <Card className="neo-card">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center min-h-[200px]">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <CardTitle className="mb-2">No serve records yet</CardTitle>
                <CardDescription className="mb-4">
                  Start a new serve attempt to create your first record
                </CardDescription>
                <Link to="/new-serve">
                  <Button>
                    <Camera className="mr-2 h-4 w-4" />
                    New Serve Attempt
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
          
          <div className="space-y-4">
            <Link to="/new-serve" className="block">
              <Card className="hover:bg-accent transition-colors">
                <CardContent className="pt-6 pb-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">New Serve Attempt</CardTitle>
                    <CardDescription>
                      Capture photo with GPS data
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/clients" className="block">
              <Card className="hover:bg-accent transition-colors">
                <CardContent className="pt-6 pb-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Manage Clients</CardTitle>
                    <CardDescription>
                      Add or edit client information
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/history" className="block">
              <Card className="hover:bg-accent transition-colors">
                <CardContent className="pt-6 pb-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">View Serve History</CardTitle>
                    <CardDescription>
                      Review all past serve attempts
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Serve Dialog */}
      {editingServe && (
        <EditServeDialog
          serve={editingServe}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveServe}
        />
      )}
    </div>
  );
};

export default Dashboard;
