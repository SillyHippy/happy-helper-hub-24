
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientData } from "@/components/ClientForm";
import { ServeAttemptData } from "@/components/ServeAttempt";
import ServeHistory from "@/components/ServeHistory";
import { Clock, ClipboardList, Search } from "lucide-react";

interface HistoryProps {
  serves: ServeAttemptData[];
  clients: ClientData[];
  deleteServe?: (serveId: string) => Promise<boolean>;
}

const History: React.FC<HistoryProps> = ({ 
  serves, 
  clients,
  deleteServe
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredServes, setFilteredServes] = useState<ServeAttemptData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("History component serves:", serves);
    console.log("History component clients:", clients);
    
    // Filter serves based on search term
    const filtered = serves.filter(serve => {
      const client = clients.find(c => c.id === serve.clientId);
      if (!client) return false;
      
      return (
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (serve.notes && serve.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (serve.caseNumber && serve.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    
    setFilteredServes(filtered);
    console.log("Filtered serves:", filtered);
  }, [searchTerm, serves, clients]);

  // Updated to pass both clientId and caseNumber, and explicitly pass previousAttempts
  const handleNewAttempt = (clientId: string, caseNumber: string, previousAttempts: number) => {
    navigate(`/new-serve?clientId=${clientId}&caseNumber=${caseNumber}`);
    console.log(`Navigating to new serve with clientId=${clientId}, caseNumber=${caseNumber}, previousAttempts=${previousAttempts}`);
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Serve History</h1>
        <p className="text-muted-foreground">
          View and manage all your serve attempts
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Card className="neo-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <CardDescription>Total Attempts</CardDescription>
                  <CardTitle className="text-2xl">{serves.length}</CardTitle>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="neo-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <CardDescription>Recent Activity</CardDescription>
                  <CardTitle className="text-2xl">
                    {serves.length > 0 
                      ? new Date(serves[0].timestamp).toLocaleDateString() 
                      : "No serves"}
                  </CardTitle>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative min-w-[240px]">
          <Input
            placeholder="Search serves..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      {serves.length === 0 ? (
        <Card className="neo-card">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="text-4xl mb-4">📋</div>
            <CardTitle className="mb-2">No serve history</CardTitle>
            <CardDescription className="mb-4">
              When you complete serve attempts, they will appear here.
            </CardDescription>
            <Button onClick={() => navigate("/new-serve")}>
              Create First Serve
            </Button>
          </CardContent>
        </Card>
      ) : filteredServes.length === 0 ? (
        <Card className="neo-card">
          <CardContent className="pt-6 text-center py-12">
            <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground/50" />
            <CardTitle className="mb-2">No matching serves</CardTitle>
            <CardDescription className="mb-4">
              Try adjusting your search terms
            </CardDescription>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ServeHistory 
          serves={filteredServes} 
          clients={clients} 
          onNewAttempt={handleNewAttempt}
          onDelete={deleteServe}
        />
      )}
    </div>
  );
};

export default History;
