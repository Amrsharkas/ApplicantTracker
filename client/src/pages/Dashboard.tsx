import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  User, 
  Target, 
  FileText, 
  TrendingUp,
  MessageCircle,
  History,
  Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import { MatchesModal } from "@/components/JobSeekerModals/MatchesModal";
import { ProfileModal } from "@/components/JobSeekerModals/ProfileModal";
import { ApplicationsModal } from "@/components/JobSeekerModals/ApplicationsModal";
import { InterviewModal } from "@/components/JobSeekerModals/InterviewModal";
import { InterviewHistoryModal } from "@/components/JobSeekerModals/InterviewHistoryModal";
import { JobPostingsModal } from "@/components/JobSeekerModals/JobPostingsModal";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    retry: false,
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["/api/job-matches"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const profileProgress = profile?.completionPercentage || 0;
  const hasCompletedProfile = profileProgress >= 80; // For showing completed status
  const canAccessInterviews = profileProgress >= 10; // Low threshold for interview access
  
  // Check if all interviews are completed
  const hasCompletedInterview = profile?.aiProfileGenerated || 
    (profile?.personalInterviewCompleted && 
     profile?.professionalInterviewCompleted && 
     profile?.technicalInterviewCompleted);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Plato</h1>
                <p className="text-sm text-gray-600">AI Job Matching Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {user?.firstName || 'Job Seeker'}
                </span>
              </div>
              <button
                onClick={() => window.location.href = '/api/logout'}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Getting Started Section or Hiring Stats */}
        <div className="mb-8">
          {/* Show hiring statistics for completed users */}
          {hasCompletedInterview ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Find Your Perfect Role!</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Your profile is complete and your AI interview has generated a comprehensive professional analysis. 
                  Use the tools below to discover opportunities that match your unique skills and career goals.
                </p>
              </div>
              
              {/* Hiring Statistics */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
                  Why Traditional Job Hunting Doesn't Work
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-600 mb-2">75%</div>
                    <p className="text-sm text-gray-700">
                      of resumes are rejected by ATS systems before human review
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-600 mb-2">3 mins</div>
                    <p className="text-sm text-gray-700">
                      average time recruiters spend reading each resume
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">250+</div>
                    <p className="text-sm text-gray-700">
                      applications submitted for each job posting on average
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-blue-200">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">How Plato Changes the Game</h4>
                    <p className="text-gray-700 max-w-3xl mx-auto">
                      Our AI understands your true potential beyond keywords. We match you with opportunities 
                      based on your skills, personality, and career goals - not just resume scanning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Show getting started checklist for incomplete users */
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Plato!</h2>
              <p className="text-gray-600 mb-6">
                Get started by completing these two simple steps to unlock personalized job matching:
              </p>
              
              <div className="space-y-4">
                {/* Step 1: Complete Profile */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  hasCompletedProfile 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        hasCompletedProfile ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {hasCompletedProfile ? '✓' : '1'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
                        <p className="text-gray-600">
                          {hasCompletedProfile 
                            ? 'Great! Your profile is complete.' 
                            : 'Add your personal information, skills, and experience to get started.'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{profileProgress}%</div>
                        <div className="text-xs text-gray-500">Complete</div>
                      </div>
                      <button
                        onClick={() => openModal('profile')}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          hasCompletedProfile 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {hasCompletedProfile ? 'Edit Profile' : 'Complete Profile'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: AI Interview */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  !canAccessInterviews 
                    ? 'border-gray-200 opacity-60' 
                    : hasCompletedInterview 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-orange-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        !canAccessInterviews 
                          ? 'bg-gray-400' 
                          : hasCompletedInterview 
                            ? 'bg-green-600' 
                            : 'bg-orange-600'
                      }`}>
                        {hasCompletedInterview ? '✓' : '2'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Take AI Interview</h3>
                        <p className="text-gray-600">
                          {!canAccessInterviews 
                            ? 'Add at least 10% profile information to unlock the AI interview.' 
                            : hasCompletedInterview 
                              ? 'Excellent! Your AI interview is complete.' 
                              : 'Chat with our AI to create your comprehensive professional profile.'
                          }
                        </p>
                        {canAccessInterviews && !hasCompletedInterview && profileProgress < 80 && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              💡 <strong>Tip:</strong> Complete more of your profile before the interview for better, more personalized questions and stronger job applications!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openModal('interview')}
                      disabled={!canAccessInterviews}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        !canAccessInterviews 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : hasCompletedInterview 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {hasCompletedInterview ? 'Review Interview' : 'Start Interview'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job Features - Only show if interview is complete */}
        {hasCompletedInterview && (
          <div className="space-y-6">
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Job Dashboard</h3>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Job Matches</p>
                      <div className="text-2xl font-bold text-gray-900">{matches.length}</div>
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Applications</p>
                      <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
                    </div>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Profile Score</p>
                      <div className="text-2xl font-bold text-gray-900">{profileProgress}%</div>
                    </div>
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => openModal('matches')}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Target className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-semibold text-gray-900">View Job Matches</h4>
                  </div>
                  <p className="text-sm text-gray-600">See jobs that match your profile with AI scoring</p>
                </button>



                <button
                  onClick={() => openModal('jobPostings')}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Briefcase className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-semibold text-gray-900">View Job Postings</h4>
                  </div>
                  <p className="text-sm text-gray-600">Browse all available job opportunities from employers</p>
                </button>

                <button
                  onClick={() => openModal('interviewHistory')}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <History className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-semibold text-gray-900">Interview History</h4>
                  </div>
                  <p className="text-sm text-gray-600">Review past interviews and generated profiles</p>
                </button>
              </div>

              {/* Applications Link */}
              <div className="bg-white rounded-lg border border-gray-200 mt-4">
                <button
                  onClick={() => openModal('applications')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">View My Applications</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruction Message for Uncompleted Steps */}
        {!hasCompletedInterview && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start space-x-3">
              <MessageCircle className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Get Started with Plato</h3>
                <p className="text-blue-800 mb-3">
                  Complete both steps above to unlock personalized job matching and start your journey to finding the perfect role.
                </p>
                <div className="text-sm text-blue-700">
                  <strong>Step 1:</strong> Fill out your profile with your skills, experience, and career preferences.<br/>
                  <strong>Step 2:</strong> Take our AI interview to create a comprehensive professional profile.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ProfileModal 
        isOpen={activeModal === 'profile'} 
        onClose={closeModal} 
      />
      <InterviewModal 
        isOpen={activeModal === 'interview'} 
        onClose={closeModal} 
      />
      <InterviewHistoryModal 
        isOpen={activeModal === 'interviewHistory'} 
        onClose={closeModal} 
        onResumeInterview={() => {
          closeModal();
          openModal('interview');
        }}
      />

      <MatchesModal 
        isOpen={activeModal === 'matches'} 
        onClose={closeModal} 
      />
      <ApplicationsModal 
        isOpen={activeModal === 'applications'} 
        onClose={closeModal} 
      />
      <JobPostingsModal 
        isOpen={activeModal === 'jobPostings'} 
        onClose={closeModal} 
      />
    </div>
  );
}