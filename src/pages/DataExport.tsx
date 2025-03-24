
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, FileSpreadsheet, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportServeData } from "@/utils/supabaseStorage";
import { useToast } from "@/hooks/use-toast";

const DataExport: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      console.log("Date range required: Please select both a start and end date");
      return;
    }

    if (startDate > endDate) {
      console.log("Invalid date range: Start date cannot be after end date");
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportServeData(startDate, endDate);
      
      if (result.success && result.data) {
        // Create a CSV file
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        // Create a link to download the file
        const link = document.createElement("a");
        const fileName = `serve-data-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Export complete: Data exported to ${fileName}`);
      } else {
        console.log("Export failed: " + (result.error || "No data found in the selected date range"));
      }
    } catch (error) {
      console.error("Export error:", error);
      console.log("Export failed: " + (error instanceof Error ? error.message : "An unexpected error occurred"));
    } finally {
      setIsExporting(false);
    }
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Data Export</h1>
        <p className="text-muted-foreground">
          Export your serve data to CSV for use in Excel or other spreadsheet applications
        </p>
      </div>

      <Card className="neo-card">
        <CardHeader>
          <CardTitle>Export Serve Data</CardTitle>
          <CardDescription>
            Select a date range and export all serve data as CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium">Start Date</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium">End Date</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            className="w-full" 
            disabled={isExporting || !startDate || !endDate}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card className="neo-card bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-amber-100 text-amber-700">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium mb-1">About Data Exports</h3>
                <p className="text-sm text-muted-foreground">
                  Exports include client information, case details, serve status, GPS coordinates, and timestamps.
                  The CSV file can be opened in Excel, Google Sheets, or any spreadsheet application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataExport;
