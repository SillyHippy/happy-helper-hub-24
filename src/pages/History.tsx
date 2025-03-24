
import React, { useState } from "react";
import ServeHistory from "@/components/ServeHistory";
import { ClientData } from "@/components/ClientForm";
import { ServeAttemptData } from "@/components/ServeAttempt";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, RefreshCw } from "lucide-react";
import { syncSupabaseServesToLocal } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import EditServeDialog from "@/components/EditServeDialog";

interface HistoryProps {
  serves: ServeAttemptData[];
  clients: ClientData[];
  deleteServe: (id: string) => Promise<boolean>;
  updateServe: (serve: ServeAttemptData) => Promise<boolean>;
}

const History: React.FC<HistoryProps> = ({ 
  serves, 
  clients, 
  deleteServe,
  updateServe
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedServe, setSelectedServe] = useState<ServeAttemptData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const synced = await syncSupabaseServesToLocal();
      
      if (synced) {
        console.log("Success: History refreshed successfully");
      } else {
        console.log("Error: Failed to refresh history");
      }
    } catch (error) {
      console.error("Error refreshing history:", error);
      console.log("Error: An error occurred while refreshing");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditServe = (serve: ServeAttemptData) => {
    setSelectedServe(serve);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Serve History</h1>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground">
          View your serve history and outcomes
        </p>
      </div>

      {serves.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <HistoryIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No serve history yet</h3>
          <p className="mb-6 text-muted-foreground">
            Create your first serve attempt to see your history here
          </p>
          <Button onClick={() => window.location.href = "/new-serve"}>
            Create Serve Attempt
          </Button>
        </div>
      ) : (
        <ServeHistory 
          serves={serves} 
          clients={clients} 
          onDelete={deleteServe}
          onEdit={handleEditServe}
        />
      )}

      {selectedServe && (
        <EditServeDialog
          serve={selectedServe}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={updateServe}
        />
      )}
    </div>
  );
}

export default History;
