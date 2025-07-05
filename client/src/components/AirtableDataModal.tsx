import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, User, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface AirtableProfile {
  name: string;
  userProfile: string;
}

interface AirtableDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AirtableDataModal({ isOpen, onClose }: AirtableDataModalProps) {
  const { toast } = useToast();

  const { data: profiles, isLoading, error, refetch } = useQuery<AirtableProfile[]>({
    queryKey: ['/api/airtable/profiles'],
    enabled: isOpen,
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Airtable Data - User Profiles
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Base: app3tA4UpKQCT2s17
              </Badge>
              <Badge variant="outline">Table: Table 1</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading Airtable data...</span>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="font-semibold">Error:</span>
                  <span>Failed to load data from Airtable</span>
                </div>
              </CardContent>
            </Card>
          )}

          {profiles && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Found {(profiles as AirtableProfile[])?.length || 0} records
                </h3>
              </div>

              {(profiles as AirtableProfile[])?.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No records found in your Airtable</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Complete an AI interview to add your first profile
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-4">
                  <div className="space-y-4">
                    {(profiles as AirtableProfile[])?.map((profile: AirtableProfile, index: number) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {profile.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700">
                              User Profile Data:
                            </div>
                            <div className="bg-gray-50 p-3 rounded-md max-h-60 overflow-y-auto">
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                {profile.userProfile}
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}