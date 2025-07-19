import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { MapPin, DollarSign, Target, Building, RefreshCw } from "lucide-react";

interface JobMatch {
  id: number;
  matchScore: number;
  matchReasons: string[];
  job: {
    id: number;
    title: string;
    company: string;
    description: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string;
    skills?: string[];
    jobType?: string;
  };
}

interface MatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MatchesModal({ isOpen, onClose }: MatchesModalProps) {
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["/api/job-matches"],
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false, // Refresh every 30 seconds when modal is open to sync with Airtable
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/job-matches"] });
    setTimeout(() => setIsRefreshing(false), 1000); // Show animation for 1 second
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-800">AI Job Matches</DialogTitle>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>
        
        <div className="max-h-[75vh] overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-20 h-20 text-slate-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-slate-700 mb-3">🔍 Still Hunting for Your Perfect Match!</h3>
              <div className="space-y-2 mb-6">
                <p className="text-lg text-slate-600">
                  Our AI matchmaker is working overtime, but your dream job is playing hard to get! 
                </p>
                <p className="text-slate-500">
                  Don't worry - we're like a persistent dating app but for careers. We never give up! 💪
                </p>
                <p className="text-sm text-slate-400 italic">
                  (Pro tip: The more interviews you complete, the better we get at finding your professional soulmate)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-70"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Check Again (Pretty Please!)
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  I'll Wait Patiently 😌
                </Button>
              </div>
            </div>
          ) : (
            matches.map((match: JobMatch, index: number) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800 text-lg">
                            {match.job.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <Badge className="text-green-600 bg-green-100 font-semibold">
                              Employer Selected
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-blue-600" />
                          <p className="text-blue-600 font-medium">{match.job.company}</p>
                        </div>
                        
                        <p className="text-slate-600 mb-3 line-clamp-2">
                          {match.job.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{match.job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>{formatSalary(match.job.salaryMin, match.job.salaryMax)}</span>
                          </div>
                          {match.job.jobType && (
                            <Badge variant="outline" className="capitalize">
                              {match.job.jobType}
                            </Badge>
                          )}
                        </div>

                        {match.job.skills && match.job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {match.job.skills.slice(0, 4).map((skill) => (
                              <Badge 
                                key={skill} 
                                variant="secondary"
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {match.job.skills.length > 4 && (
                              <Badge variant="outline">
                                +{match.job.skills.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-sm font-medium text-green-700 mb-1">✨ Pre-Approved Position</p>
                          <p className="text-sm text-green-600">
                            Congratulations! The employer has already reviewed your profile and selected you for this position.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Button
                          onClick={() => {
                            toast({
                              title: "Interview Request Sent",
                              description: "We'll connect you with the employer to arrange your interview!",
                            });
                          }}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                        >
                          Arrange Interview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
