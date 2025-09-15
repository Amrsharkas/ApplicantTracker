import { useState, useEffect, useRef } from "react";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  User, 
  Target, 
  FileText, 
  TrendingUp,
  MessageCircle,
  Briefcase,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useResumeRequirement } from "@/hooks/useResumeRequirement";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

import { MatchesModal } from "@/components/JobSeekerModals/MatchesModal";
import { ComprehensiveProfileModal } from "@/components/JobSeekerModals/ComprehensiveProfileModal";
import { UserProfileModal } from "@/components/JobSeekerModals/UserProfileModal";
import { ApplicationsModal } from "@/components/JobSeekerModals/ApplicationsModal";
import { InterviewModal } from "@/components/JobSeekerModals/InterviewModal";
import { UpcomingInterviewModal } from "@/components/JobSeekerModals/UpcomingInterviewModal";
import { InvitedJobsModal } from "@/components/JobSeekerModals/InvitedJobsModal";

import { JobPostingsModal } from "@/components/JobSeekerModals/JobPostingsModal";
import { JobSpecificAIInterviewsModal } from "@/components/JobSeekerModals/JobSpecificAIInterviewsModal";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<{title: string, id: string} | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: comprehensiveProfile, refetch: refetchComprehensiveProfile } = useQuery({
    queryKey: ["/api/comprehensive-profile"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["/api/job-matches"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refresh every 30 seconds to sync with Airtable monitoring
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: upcomingInterviews = [] } = useQuery({
    queryKey: ["/api/upcoming-interviews"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refresh every 30 seconds to sync with Airtable monitoring
    enabled: !!user, // Only run query if user is authenticated
  });

  // Check CV requirement (renamed from resume for clarity)
  const { hasResume: hasCV } = useResumeRequirement();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is not authenticated, don't render dashboard (redirect will happen)
  if (!user) {
    return null;
  }

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedJobDetails(null); // Reset job details when closing
    // Refresh profile data when closing modals to ensure dashboard is up-to-date
    refetchProfile();
    refetchComprehensiveProfile();
  };

  const openJobDetails = (jobTitle: string, jobId: string) => {
    setSelectedJobDetails({ title: jobTitle, id: jobId });
    setActiveModal('jobPostings');
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and provide helpful guidance
    if (!file.type.includes('pdf') && !file.type.includes('text')) {
      toast({
        title: t('dashboard.invalidFileType'),
        description: t('dashboard.invalidFileTypeDescription'),
        variant: "destructive",
      });
      return;
    }

    // Provide guidance for PDF files
    if (file.type.includes('pdf')) {
      toast({
        title: t('dashboard.pdfUploadTips'),
        description: t('dashboard.pdfUploadTipsDescription'),
      });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('dashboard.fileTooLarge'),
        description: t('dashboard.fileTooLargeDescription'),
        variant: "destructive",
      });
      return;
    }

    setIsUploadingResume(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resume/process-and-populate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();

      toast({
        title: t('dashboard.resumeProcessedSuccessfully'),
        description: t('dashboard.resumeProcessedDescription', { sections: Object.keys(result.extractedFields || {}).filter(key => result.extractedFields[key]).length }),
      });

      // Refresh profile data to show updated information
      refetchProfile();
      refetchComprehensiveProfile();

    } catch (error: any) {
      console.error('Resume upload failed:', error);
      toast({
        title: t('dashboard.uploadFailed'),
        description: error.message || t('dashboard.uploadFailedDescription'),
        variant: "destructive",
      });
    } finally {
      setIsUploadingResume(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Use backend-calculated completion percentage for consistency
  const profileProgress = (comprehensiveProfile as any)?.completionPercentage || 0;
  
  // Check if comprehensive profile has required fields completed (75% threshold for interviews)
  const hasCompleteProfile = profileProgress >= 99;
  
  // More strict interview completion check - require ALL three interviews AND aiProfileGenerated
  const hasCompletedPersonalInterview = (profile as any)?.personalInterviewCompleted;
  const hasCompletedProfessionalInterview = (profile as any)?.professionalInterviewCompleted;
  const hasCompletedTechnicalInterview = (profile as any)?.technicalInterviewCompleted;
  const hasAiProfileGenerated = (profile as any)?.aiProfileGenerated;
  
  const hasCompletedAllInterviews = hasCompletedPersonalInterview && hasCompletedProfessionalInterview && hasCompletedTechnicalInterview;
  const hasCompletedInterview = hasCompletedAllInterviews && hasAiProfileGenerated;
  
  // Show full dashboard only when BOTH steps are complete: complete profile (including CV) AND ALL interviews completed
  const showFullDashboard = hasCompleteProfile && hasCompletedInterview;

  // Show welcome toast only once after completing interview
  useEffect(() => {
    if (showFullDashboard && (profile as any)?.aiProfileGenerated) {
      // Check if we've already shown this toast
      const hasShownWelcomeToast = localStorage.getItem(`welcomeToast_${(user as any)?.id}`);
      
      if (!hasShownWelcomeToast) {
        toast({
          title: t('dashboard.readyToFindRole'),
          description: t('dashboard.readyToFindRoleDescription'),
          duration: 8000, // Show for 8 seconds
        });
        
        // Mark that we've shown the toast for this user
        localStorage.setItem(`welcomeToast_${(user as any)?.id}`, 'shown');
      }
    }
  }, [showFullDashboard, (profile as any)?.aiProfileGenerated, (user as any)?.id, toast]);

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('plato')}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <LanguageSwitcher />
              

              <button
                onClick={() => openModal('userProfile')}
                className="flex items-center space-x-2 rtl:space-x-reverse hover:bg-gray-50 rounded-lg p-2 transition-colors"
                title="Edit user profile"
              >
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {(user as any)?.firstName || 'Job Seeker'}
                </span>
              </button>
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {logout.isPending ? t('signingOut') : t('signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Getting Started Section or Hiring Stats */}
        <div className="mb-8">
          {/* Show full dashboard for completed users */}
          {showFullDashboard ? (
            <div className="space-y-6">
              {/* Removed congratulations message - now shown as toast notification */}
            </div>
          ) : (
            /* Show getting started checklist for incomplete users */
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('welcome')}</h2>
              <p className="text-gray-600 mb-6">
                {t('dashboard.completeSteps')}
              </p>
              
              <div className="space-y-4">
                {/* Step 1: Build Complete Profile (includes CV data) */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  hasCompleteProfile 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className={`min-w-10 min-h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        hasCompleteProfile ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {hasCompleteProfile ? '✓' : '1'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{t('buildProfile')}</h3>
                        <p className="text-gray-600">
                          {hasCompleteProfile 
                            ? t('interviewsUnlocked')
                            : t('profileDescription')
                          }
                        </p>
                        {!hasCompleteProfile && (
                          <p className="text-sm text-green-600 mt-1">
                            💡 Tip: Upload your resume and we'll extract as much information as we can to auto-fill your profile!
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="text-end">
                        <div className="text-2xl font-bold text-gray-900">{profileProgress}%</div>
                        <div className="text-xs text-gray-500">{t('complete')}</div>
                      </div>
                      <div className="flex space-x-2 rtl:space-x-reverse ">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.txt"
                          onChange={handleResumeUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingResume}
                          className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 rtl:space-x-reverse"
                        >
                          {isUploadingResume ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span>{isUploadingResume ? t('dashboard.uploading') : t('dashboard.uploadResume')}</span>
                        </button>
                        <button
                          onClick={() => openModal('profile')}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            hasCompleteProfile 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
{hasCompleteProfile ? 'Edit Profile' : t('buildProfileButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: AI Interview */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  !hasCompleteProfile
                    ? 'border-gray-200 opacity-60' 
                    : hasCompletedInterview 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-purple-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        !hasCompleteProfile
                          ? 'bg-gray-400' 
                          : hasCompletedInterview 
                            ? 'bg-green-600' 
                            : 'bg-purple-600'
                      }`}>
                        {hasCompletedInterview ? '✓' : '2'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{t('takeInterview')}</h3>
                        <p className="text-gray-600">
                          {!hasCompleteProfile
                            ? t('interviewDescription')
                            : hasCompletedInterview
                              ? t('dashboard.excellentInterviewComplete')
                              : t('step2')
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal('interview')}
                      disabled={!hasCompleteProfile}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        !hasCompleteProfile
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : hasCompletedInterview 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
{hasCompletedInterview ? t('dashboard.reviewInterview') : t('startInterview')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job Features - Only show if interview is complete or profile is 80%+ */}
        {!showFullDashboard && (
          <div className="space-y-8">
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">{t('jobDashboard')}</h3>

              {/* Large Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <button
                  onClick={() => openModal('matches')}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-start group transform hover:scale-105"
                >
                  <div className="flex items-center space-x-4 rtl:space-x-reverse mb-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">{t('jobMatches')}</h4>
                      <p className="text-blue-100 text-lg">{t('aiCuratedOpportunities')}</p>
                    </div>
                  </div>
                  <p className="text-blue-100 text-base leading-relaxed">
                    {t('discoverPersonalizedJobs')}
                  </p>
                </button>

                <button
                  onClick={() => openModal('jobPostings')}
                  className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-start group transform hover:scale-105"
                >
                  <div className="flex items-center space-x-4 rtl:space-x-reverse mb-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <Briefcase className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">{t('jobPostings')}</h4>
                      <p className="text-green-100 text-lg">{t('exploreOpportunities')}</p>
                    </div>
                  </div>
                  <p className="text-green-100 text-base leading-relaxed">
                    {t('browseLatestJobs')}
                  </p>
                </button>
              </div>

              {/* Job specific AI interviews - New widget (above upcoming) */}
              <button
                onClick={() => openModal('jobSpecificAI')}
                className={`w-full rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-6 ${
                  hasCompletedAllInterviews
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed opacity-70'
                }`}
                disabled={!hasCompletedAllInterviews}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className={`bg-white bg-opacity-20 rounded-lg p-3 ${
                      !hasCompletedAllInterviews ? 'opacity-50' : ''
                    }`}>
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-start">
                      <h4 className="text-xl font-bold">{t('dashboard.jobSpecificAI')}</h4>
                      <p className={`${
                        hasCompletedAllInterviews ? 'text-emerald-100' : 'text-gray-300'
                      }`}>
                        {hasCompletedAllInterviews
                          ? t('dashboard.jobSpecificAIDescription')
                          : 'Complete all 3 interviews first to unlock job-specific interviews'
                        }
                      </p>
                      {!hasCompletedAllInterviews && (
                        <p className="text-xs text-gray-300 mt-1">
                          🔒 Complete Personal, Professional, and Technical interviews to unlock
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`text-2xl ${hasCompletedAllInterviews ? 'text-white' : 'text-gray-300'}`}>
                    {isRTL ? '←' : '→'}
                  </div>
                </div>
              </button>

              {/* Upcoming Interview - Always show */}
              <button
                onClick={() => openModal('upcomingInterview')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-start">
                      <h4 className="text-xl font-bold">{t('upcomingInterviews')}</h4>
                      <p className="text-blue-100">
                        {(upcomingInterviews as any[]).length > 0 
                          ? `${(upcomingInterviews as any[]).length} interview${(upcomingInterviews as any[]).length > 1 ? 's' : ''} scheduled`
                          : t('stayUpdated')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-2xl">{isRTL ? '←' : '→'}</div>
                </div>
              </button>

              {/* Applications Button - Full Width */}
              <button
                onClick={() => openModal('applications')}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-start">
                      <h4 className="text-xl font-bold">{t('myApplications')}</h4>
                      <p className="text-purple-100">{t('trackApplicationStatus')}</p>
                    </div>
                  </div>
                  <div className="text-white text-2xl">{isRTL ? '←' : '→'}</div>
                </div>
              </button>

              {/* Invited Jobs - Full Width */}
              <button
                onClick={() => openModal('invitedJobs')}
                className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-start">
                      <h4 className="text-xl font-bold">{t('dashboard.invitedJobs')}</h4>
                      <p className="text-green-100">{t('dashboard.invitedJobsDescription')}</p>
                    </div>
                  </div>
                  <div className="text-white text-2xl">{isRTL ? '←' : '→'}</div>
                </div>
              </button>

              {/* Small Stats Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 mb-3">{t('quickStats')}</h4>
                <div className="flex items-center space-x-8 rtl:space-x-reverse text-sm">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Target className="h-3 w-3 text-green-600" />
                    <span className="text-gray-600">{t('jobMatchesLabel')}:</span>
                    <span className="font-medium text-gray-900">{(matches as any[]).length}</span>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <FileText className="h-3 w-3 text-purple-600" />
                    <span className="text-gray-600">{t('applicationsLabel')}:</span>
                    <span className="font-medium text-gray-900">{(applications as any[]).length}</span>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <User className="h-3 w-3 text-blue-600" />
                    <span className="text-gray-600">{t('profileCompletionLabel')}:</span>
                    <span className="font-medium text-gray-900">{profileProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Compact Industry Stats */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-center">
                  <h5 className="text-xs font-medium text-gray-500 mb-3">{t('whyJobSeekingChallenging')}</h5>
                  <div className="flex justify-center items-center space-x-8 rtl:space-x-reverse text-xs">
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{t('sixMonths')}</div>
                      <p className="text-gray-600">{t('avgJobSearchTime')}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{t('oneHundredEighteen')}</div>
                      <p className="text-gray-600">{t('applicationsToGetOffer')}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{t('twoPercent')}</div>
                      <p className="text-gray-600">{t('applicationResponseRate')}</p>
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
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <MessageCircle className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">{t('dashboard.getStartedWithPlato')}</h3>
                <p className="text-blue-800 mb-3">
                  {t('dashboard.getStartedWithPlatoDescription')}
                </p>
                <div className="text-sm text-blue-700">
                  {t('dashboard.step1Description')}<br/>
                  {t('dashboard.step2Description')}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => openModal('jobPostings')}
                    className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                  >
                    {t('dashboard.browseJobPostings')}
                  </button>
                  <button
                    onClick={() => openModal('invitedJobs')}
                    className="me-3 px-4 py-2 rounded-lg font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {t('dashboard.invitedJobs')}
                  </button>
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
      <UpcomingInterviewModal 
        isOpen={activeModal === 'upcomingInterview'} 
        onClose={closeModal} 
      />
      <InvitedJobsModal
        isOpen={activeModal === 'invitedJobs'}
        onClose={closeModal}
        onStartJobPractice={async (job) => {
          try {
            const res = await fetch('/api/interview/start-job-practice', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ job })
            });
            if (!res.ok) throw new Error('Failed to start');
            setActiveModal('interview');
          } catch (e: any) {
            toast({ title: 'Failed to start interview', description: e?.message || 'Please try again', variant: 'destructive' });
          }
        }}
        onStartJobPracticeVoice={async (job) => {
          try {
            const res = await fetch('/api/interview/start-job-practice-voice', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ job })
            });
            if (!res.ok) throw new Error('Failed to start');
            setActiveModal('interview');
          } catch (e: any) {
            toast({ title: 'Failed to start voice interview', description: e?.message || 'Please try again', variant: 'destructive' });
          }
        }}
      />
      <JobSpecificAIInterviewsModal
        isOpen={activeModal === 'jobSpecificAI'}
        onClose={closeModal}
        onStartJobPractice={async () => { setActiveModal('interview'); }}
        onStartJobPracticeVoice={async () => { setActiveModal('interview'); }}
      />
      <JobPostingsModal 
        isOpen={activeModal === 'jobPostings'} 
        onClose={closeModal} 
        initialJobTitle={selectedJobDetails?.title}
        initialJobId={selectedJobDetails?.id}
        onStartJobPractice={(job) => {
          (async () => {
            try {
              const res = await fetch('/api/interview/start-job-practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ job })
              });
              if (!res.ok) {
                throw new Error(`Failed to start practice interview (${res.status})`);
              }
              // Open after session is created so modal query loads it immediately
              setActiveModal('interview');
            } catch (err: any) {
              toast({
                title: 'Practice Interview Failed',
                description: err?.message || 'Could not start a practice interview for this job.',
                variant: 'destructive'
              });
            }
          })();
        }}
        onStartJobPracticeVoice={(job) => {
          (async () => {
            try {
              const res = await fetch('/api/interview/start-job-practice-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ job })
              });
              if (!res.ok) {
                throw new Error(`Failed to start voice practice interview (${res.status})`);
              }
              setActiveModal('interview');
            } catch (err: any) {
              toast({
                title: 'Voice Practice Failed',
                description: err?.message || 'Could not start a voice practice interview for this job.',
                variant: 'destructive'
              });
            }
          })();
        }}
      />
    </div>
  );
}