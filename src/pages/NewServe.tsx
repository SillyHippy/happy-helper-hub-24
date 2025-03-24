import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ServeAttempt, { ServeAttemptData } from "@/components/ServeAttempt";
import { ClientData } from "@/components/ClientForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getServeAttemptsCount, updateCaseStatus } from "@/utils/supabaseStorage";
import { useToast } from "@/hooks/use-toast";
import { isGeolocationCoordinates } from "@/utils/gps";

interface NewServeProps {
  clients: ClientData[];
  addServe: (serve: ServeAttemptData) => void;
  clientId?: string;
  previousAttempts?: number;
}

const NewServe: React.FC<NewServeProps> = ({ 
  clients, 
  addServe, 
  clientId,
  previousAttempts = 0
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [caseAttempts, setCaseAttempts] = useState<number>(previousAttempts);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const paramClientId = searchParams.get("clientId") || clientId;
  const paramCaseNumber = searchParams.get("caseNumber");
  const { toast } = useToast();

  useEffect(() => {
    console.log("NewServe component - Initial props:", { 
      clientId, 
      previousAttempts, 
      paramClientId, 
      paramCaseNumber 
    });
  }, []);

  useEffect(() => {
    const fetchAttemptCount = async () => {
      setIsLoading(true);
      if (paramClientId && paramCaseNumber) {
        try {
          console.log(`Fetching attempt count for client ${paramClientId} case ${paramCaseNumber}`);
          const count = await getServeAttemptsCount(paramClientId, paramCaseNumber);
          console.log(`Found ${count} previous attempts`);
          setCaseAttempts(count);
        } catch (error) {
          console.error("Error fetching attempt count:", error);
          console.log("Could not retrieve previous serve attempts");
          setIsLoading(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log("Missing clientId or caseNumber, cannot fetch attempt count");
        setIsLoading(false);
      }
    };
    
    fetchAttemptCount();
  }, [paramClientId, paramCaseNumber]);

  const handleServeComplete = async (serveData: ServeAttemptData) => {
    console.log("Serve complete, data:", serveData);
    
    if (!isGeolocationCoordinates(serveData.coordinates)) {
      console.warn("Invalid coordinates detected, setting to null");
      serveData.coordinates = null;
    }
    
    if (serveData.clientId && serveData.caseNumber) {
      try {
        const statusUpdated = await updateCaseStatus(
          serveData.clientId,
          serveData.caseNumber,
          serveData.status
        );
        
        if (statusUpdated) {
          console.log(`Case status updated for case ${serveData.caseNumber}`);
        } else {
          console.log(`Failed to update case status for case ${serveData.caseNumber}`);
        }
      } catch (error) {
        console.error("Error updating case status:", error);
      }
    }
    
    addServe(serveData);
    navigate("/history");
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          className="mb-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight mb-2">New Serve Attempt</h1>
        <p className="text-muted-foreground">
          Create a new serve record with photo evidence and GPS location
        </p>
        {caseAttempts > 0 && (
          <p className="text-sm bg-primary/10 text-primary mt-2 p-1 px-2 rounded-full inline-block">
            Attempt #{caseAttempts + 1}
          </p>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-lg font-medium mb-2">No clients found</h2>
          <p className="text-muted-foreground mb-4">
            You need to add a client before creating a serve attempt.
          </p>
          <Button onClick={() => navigate("/clients")}>
            Add Client
          </Button>
        </div>
      ) : (
        <ServeAttempt 
          clients={clients} 
          onComplete={handleServeComplete}
          previousAttempts={caseAttempts}
        />
      )}
    </div>
  );
};

export default NewServe;
