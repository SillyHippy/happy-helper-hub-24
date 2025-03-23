
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, FileText, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import { searchCases, getClient } from '@/lib/appwrite';
import { Case, Client, CaseWithClient } from '@/lib/types';

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CaseWithClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await searchCases(searchQuery);
      
      // Attach client data to each case
      const resultsWithClients = await Promise.all(
        results.map(async (caseData) => {
          try {
            const clientData = await getClient(caseData.clientId);
            return { ...caseData, client: clientData };
          } catch (error) {
            console.error(`Error fetching client for case ${caseData.$id}:`, error);
            return { ...caseData };
          }
        })
      );
      
      setSearchResults(resultsWithClients);
      
      if (resultsWithClients.length === 0) {
        toast.info('No cases found matching your search.');
      }
    } catch (error) {
      console.error('Error searching cases:', error);
      toast.error('Failed to search cases');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const viewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const viewClient = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/clients/${clientId}/cases`);
  };

  const goToServe = (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/serve/${caseId}`);
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'served':
        return 'bg-green-500/10 text-green-600 hover:bg-green-500/20';
      case 'attempted':
        return 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20';
      case 'pending':
        return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20';
      case 'canceled':
        return 'bg-red-500/10 text-red-600 hover:bg-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20';
    }
  };

  const filteredResults = () => {
    if (activeTab === 'all') return searchResults;
    return searchResults.filter(caseData => caseData.status === activeTab);
  };

  return (
    <Layout>
      <PageHeader
        title="Search Cases"
        description="Search for cases by name, case number, or service address."
      />
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {searchResults.length > 0 && (
        <div className="space-y-4 animate-in">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Results ({searchResults.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({searchResults.filter(c => c.status === 'pending').length})</TabsTrigger>
              <TabsTrigger value="attempted">Attempted ({searchResults.filter(c => c.status === 'attempted').length})</TabsTrigger>
              <TabsTrigger value="served">Served ({searchResults.filter(c => c.status === 'served').length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {filteredResults().map((caseData) => (
                <Card 
                  key={caseData.$id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => viewCase(caseData.$id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{caseData.caseName}</CardTitle>
                        <CardDescription>
                          Case #{caseData.caseNumber}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={getStatusBadgeStyles(caseData.status)}>
                        {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User size={14} className="mr-1" />
                        <span className="mr-1">Client:</span>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={(e) => viewClient(caseData.clientId, e)}
                        >
                          {caseData.client?.name || 'Unknown Client'}
                        </Button>
                      </div>
                      <div className="flex items-start text-sm text-muted-foreground">
                        <MapPin size={14} className="mr-1 mt-1 shrink-0" />
                        <span className="mr-1">Address:</span>
                        <span className="line-clamp-1">{caseData.serviceAddress}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <div className="flex justify-end w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={(e) => goToServe(caseData.$id, e)}
                      >
                        Serve
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {searchQuery && !loading && searchResults.length === 0 && (
        <div className="text-center py-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <SearchIcon className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No cases found</h3>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            We couldn't find any cases matching "{searchQuery}". Try using different keywords or check the spelling.
          </p>
        </div>
      )}
    </Layout>
  );
};

export default Search;
