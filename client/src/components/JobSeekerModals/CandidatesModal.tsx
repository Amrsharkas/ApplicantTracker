import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Users, MapPin, Briefcase, Clock, User } from "lucide-react";

interface CandidateProfile {
  id: string;
  name: string;
  userProfile: string;
  location: string;
  background: string;
  skills: string;
  interests: string;
  experience: string;
  createdTime: string;
  rawData: any;
}

interface CandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CandidatesModal({ isOpen, onClose }: CandidatesModalProps) {
  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ['/api/candidates'],
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidate Profiles from Airtable
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                Loading candidate profiles...
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-red-600">
                <p>Failed to load candidate profiles</p>
                <p className="text-sm mt-2">Please check your Airtable connection</p>
              </div>
            </div>
          )}

          {candidates && Array.isArray(candidates) && (
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Found {candidates.length} candidate profiles
              </div>
              
              {candidates.map((candidate: CandidateProfile) => (
                <div key={candidate.id} className="border rounded-lg p-6 bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{candidate.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {new Date(candidate.createdTime).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {candidate.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{candidate.location}</span>
                      </div>
                    )}
                    
                    {candidate.experience && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{candidate.experience}</span>
                      </div>
                    )}
                  </div>

                  {candidate.background && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Background</h4>
                      <p className="text-sm text-gray-600">{candidate.background}</p>
                    </div>
                  )}

                  {candidate.skills && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.split(',').map((skill: string, index: number) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {candidate.interests && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Interests</h4>
                      <p className="text-sm text-gray-600">{candidate.interests}</p>
                    </div>
                  )}

                  {candidate.userProfile && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                        View Full Profile
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap font-mono">
                        {candidate.userProfile}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {candidates && Array.isArray(candidates) && candidates.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No candidate profiles found</p>
                <p className="text-sm mt-2">Complete some interviews to see profiles here</p>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}