import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  User, 
  Target, 
  FileText, 
  TrendingUp,
  MessageCircle,
  Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import { MatchesModal } from "@/components/JobSeekerModals/MatchesModal";
import { ComprehensiveProfileModal } from "@/components/JobSeekerModals/ComprehensiveProfileModal";
import { UserProfileModal } from "@/components/JobSeekerModals/UserProfileModal";
import { ApplicationsModal } from "@/components/JobSeekerModals/ApplicationsModal";
import { InterviewModal } from "@/components/JobSeekerModals/InterviewModal";

import { JobPostingsModal } from "@/components/JobSeekerModals/JobPostingsModal";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<{title: string, id: string} | null>(null);

  const { data: profile, refetch: refetchProfile } = useQuery({
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
    refetchInterval: 30000, // Refresh every 30 seconds to sync with Airtable monitoring
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
    setSelectedJobDetails(null); // Reset job details when closing
    // Refresh profile data when closing modals to ensure dashboard is up-to-date
    refetchProfile();
  };

  const openJobDetails = (jobTitle: string, jobId: string) => {
    setSelectedJobDetails({ title: jobTitle, id: jobId });
    setActiveModal('jobPostings');
  };

  const profileProgress = profile?.completionPercentage || 0;
  const hasEssentialInfo = !!(profile?.name || profile?.email || profile?.phone || profile?.location || profile?.age);
  const hasCompletedInterview = profile?.aiProfileGenerated;
  
  // Show full dashboard only when BOTH essential info is complete AND AI interview is done
  const showFullDashboard = hasEssentialInfo && hasCompletedInterview;

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
              <button
                onClick={() => openModal('userProfile')}
                className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                title="Edit user profile"
              >
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {user?.firstName || 'Job Seeker'}
                </span>
              </button>
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
          {showFullDashboard ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Find Your Perfect Role!</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Your profile is complete and your AI interview has generated a comprehensive professional analysis. 
                  Use the tools below to discover opportunities that match your unique skills and career goals.
                </p>
              </div>
              

            </div>
          ) : (
            /* Show getting started checklist for incomplete users */
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Plato!</h2>
              <p className="text-gray-600 mb-6">
                Complete both steps below to unlock personalized job matching and access your full dashboard:
              </p>
              
              <div className="space-y-4">
                {/* Step 1: Complete Profile */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  hasEssentialInfo 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        hasEssentialInfo ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {hasEssentialInfo ? '✓' : '1'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
                        <p className="text-gray-600">
                          {hasEssentialInfo 
                            ? 'Great! Your essential information is complete.' 
                            : 'Add your essential information to unlock the AI interview.'
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
                          hasEssentialInfo 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {hasEssentialInfo ? 'Edit Profile' : 'Complete Profile'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: AI Interview */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  !hasEssentialInfo 
                    ? 'border-gray-200 opacity-60' 
                    : hasCompletedInterview 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-orange-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        !hasEssentialInfo 
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
                          {!hasEssentialInfo 
                            ? 'Complete your essential information first to unlock the AI interview.' 
                            : hasCompletedInterview 
                              ? 'Excellent! Your AI interview is complete.' 
                              : 'Chat with our AI to create your comprehensive professional profile.'
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal('interview')}
                      disabled={!hasEssentialInfo}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        !hasEssentialInfo 
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

        {/* Job Features - Only show if interview is complete or profile is 80%+ */}
        {showFullDashboard && (
          <div className="space-y-8">
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Your Job Dashboard</h3>

              {/* Large Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <button
                  onClick={() => openModal('matches')}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-105"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">Job Matches</h4>
                      <p className="text-blue-100 text-lg">AI-Curated Opportunities</p>
                    </div>
                  </div>
                  <p className="text-blue-100 text-base leading-relaxed">
                    Discover personalized job matches based on your AI interview analysis and profile data
                  </p>
                </button>

                <button
                  onClick={() => openModal('jobPostings')}
                  className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-105"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <Briefcase className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">Job Postings</h4>
                      <p className="text-green-100 text-lg">Browse All Opportunities</p>
                    </div>
                  </div>
                  <p className="text-green-100 text-base leading-relaxed">
                    Explore all available positions with smart filtering and AI-powered match scoring
                  </p>
                </button>
              </div>

              {/* Applications Button - Full Width */}
              <button
                onClick={() => openModal('applications')}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-bold">My Applications</h4>
                      <p className="text-purple-100">Track your application status and progress</p>
                    </div>
                  </div>
                  <div className="text-white text-2xl">→</div>
                </div>
              </button>

              {/* Small Stats Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Quick Stats</h4>
                <div className="flex items-center space-x-8 text-sm">
                  <div className="flex items-center space-x-2">
                    <Target className="h-3 w-3 text-green-600" />
                    <span className="text-gray-600">Job Matches:</span>
                    <span className="font-medium text-gray-900">{matches.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-3 w-3 text-purple-600" />
                    <span className="text-gray-600">Applications:</span>
                    <span className="font-medium text-gray-900">{applications.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3 text-blue-600" />
                    <span className="text-gray-600">Profile Completion:</span>
                    <span className="font-medium text-gray-900">{profileProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Compact Industry Stats */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-center">
                  <h5 className="text-xs font-medium text-gray-500 mb-3">Why Job Seeking Is So Challenging</h5>
                  <div className="flex justify-center items-center space-x-8 text-xs">
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">6 months</div>
                      <p className="text-gray-600">average job search time</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">118</div>
                      <p className="text-gray-600">applications to get one offer</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">2%</div>
                      <p className="text-gray-600">application response rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instruction Message for Uncompleted Steps */}
        {!showFullDashboard && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start space-x-3">
              <MessageCircle className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Get Started with Plato</h3>
                <p className="text-blue-800 mb-3">
                  Complete both steps above to unlock your personalized job dashboard with matches, applications, and career insights.
                </p>
                <div className="text-sm text-blue-700">
                  <strong>Step 1:</strong> Fill out your essential profile information (name, email, phone, location, or age) to unlock the AI interview.<br/>
                  <strong>Step 2:</strong> Complete all 3 AI interview components to generate your comprehensive professional analysis.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <UserProfileModal 
        isOpen={activeModal === 'userProfile'} 
        onClose={closeModal} 
      />
      <ComprehensiveProfileModal 
        isOpen={activeModal === 'profile'} 
        onClose={closeModal} 
      />
      <InterviewModal 
        isOpen={activeModal === 'interview'} 
        onClose={closeModal} 
      />


      <MatchesModal 
        isOpen={activeModal === 'matches'} 
        onClose={closeModal} 
      />
      <ApplicationsModal 
        isOpen={activeModal === 'applications'} 
        onClose={closeModal} 
        onOpenJobDetails={openJobDetails}
      />
      <JobPostingsModal 
        isOpen={activeModal === 'jobPostings'} 
        onClose={closeModal} 
        initialJobTitle={selectedJobDetails?.title}
        initialJobId={selectedJobDetails?.id}
      />
    </div>
  );
}