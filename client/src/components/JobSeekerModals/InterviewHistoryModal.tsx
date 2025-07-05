import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  User, 
  Briefcase, 
  Target, 
  Lightbulb,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";

interface InterviewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeInterview: () => void;
}

interface InterviewRecord {
  id: number;
  createdAt: string;
  isCompleted: boolean;
  sessionData: {
    questions: Array<{ question: string; context?: string }>;
    responses: Array<{ question: string; answer: string }>;
    currentQuestionIndex: number;
  };
  generatedProfile?: {
    summary: string;
    skills: string[];
    strengths: string[];
    workStyle: string;
    careerGoals: string;
    personality: string;
    experience: Array<{
      role: string;
      company: string;
      duration: string;
      description: string;
    }>;
  };
}

export function InterviewHistoryModal({ isOpen, onClose, onResumeInterview }: InterviewHistoryModalProps) {
  const [expandedProfiles, setExpandedProfiles] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["/api/interview/history"],
    enabled: isOpen,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const toggleProfileExpansion = (interviewId: number) => {
    const newExpanded = new Set(expandedProfiles);
    if (newExpanded.has(interviewId)) {
      newExpanded.delete(interviewId);
    } else {
      newExpanded.add(interviewId);
    }
    setExpandedProfiles(newExpanded);
  };

  const completedInterviews = interviews.filter((interview: InterviewRecord) => interview.isCompleted);
  const incompleteInterview = interviews.find((interview: InterviewRecord) => !interview.isCompleted);
  const completionRate = interviews.length > 0 ? (completedInterviews.length / interviews.length) * 100 : 0;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Interview History
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-6">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Interviews</p>
                    <p className="text-2xl font-bold">{interviews.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{completedInterviews.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold">{Math.round(completionRate)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
                <Progress value={completionRate} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Incomplete Interview Section */}
          {incompleteInterview && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <PlayCircle className="h-5 w-5" />
                  Resume Your Interview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-orange-700">
                      Started on {format(new Date(incompleteInterview.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-orange-600">
                        Progress: {incompleteInterview.sessionData.responses.length} of {incompleteInterview.sessionData.questions.length} questions
                      </span>
                    </div>
                    <Progress 
                      value={(incompleteInterview.sessionData.responses.length / incompleteInterview.sessionData.questions.length) * 100} 
                      className="w-64 h-2"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      onClose();
                      onResumeInterview();
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Resume Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Interviews Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Completed Interviews ({completedInterviews.length})
            </h3>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading interview history...</p>
              </div>
            ) : completedInterviews.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No completed interviews yet.</p>
                  <p className="text-sm text-gray-500 mt-1">Complete your first interview to see your AI-generated profile here!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedInterviews.map((interview: InterviewRecord) => (
                  <Card key={interview.id} className="border-green-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <CardTitle className="text-lg">
                              Interview #{interview.id}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              Completed on {format(new Date(interview.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {interview.sessionData.responses.length} Questions Answered
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleProfileExpansion(interview.id)}
                          >
                            {expandedProfiles.has(interview.id) ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide Profile
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                View Profile
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedProfiles.has(interview.id) && interview.generatedProfile && (
                      <CardContent className="border-t bg-gray-50">
                        <div className="space-y-6">
                          {/* Profile Summary */}
                          <div>
                            <h4 className="font-semibold flex items-center gap-2 mb-3">
                              <User className="h-4 w-4" />
                              Professional Summary
                            </h4>
                            <p className="text-gray-700 leading-relaxed">
                              {interview.generatedProfile.summary}
                            </p>
                          </div>

                          {/* Skills */}
                          <div>
                            <h4 className="font-semibold flex items-center gap-2 mb-3">
                              <Lightbulb className="h-4 w-4" />
                              Key Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {interview.generatedProfile.skills?.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Strengths */}
                          <div>
                            <h4 className="font-semibold flex items-center gap-2 mb-3">
                              <Target className="h-4 w-4" />
                              Core Strengths
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {interview.generatedProfile.strengths?.map((strength, index) => (
                                <Badge key={index} variant="outline" className="border-green-300 text-green-700">
                                  {strength}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Work Style & Career Goals */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <Briefcase className="h-4 w-4" />
                                Work Style
                              </h4>
                              <p className="text-sm text-gray-700">
                                {interview.generatedProfile.workStyle}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4" />
                                Career Goals
                              </h4>
                              <p className="text-sm text-gray-700">
                                {interview.generatedProfile.careerGoals}
                              </p>
                            </div>
                          </div>

                          {/* Experience */}
                          {interview.generatedProfile.experience && interview.generatedProfile.experience.length > 0 && (
                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-3">
                                <Briefcase className="h-4 w-4" />
                                Experience Highlights
                              </h4>
                              <div className="space-y-3">
                                {interview.generatedProfile.experience.map((exp, index) => (
                                  <div key={index} className="border-l-2 border-blue-200 pl-4">
                                    <h5 className="font-medium">{exp.role} at {exp.company}</h5>
                                    <p className="text-sm text-gray-600">{exp.duration}</p>
                                    <p className="text-sm text-gray-700 mt-1">{exp.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}