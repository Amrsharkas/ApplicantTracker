import { useState, useEffect } from "react";
import { useAuth, useLogout } from "@/hooks/useAuth";
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
import { useResumeRequirement } from "@/hooks/useResumeRequirement";
import { isUnauthorizedError } from "@/lib/authUtils";

import { MatchesModal } from "@/components/JobSeekerModals/MatchesModal";
import { ComprehensiveProfileModal } from "@/components/JobSeekerModals/ComprehensiveProfileModal";
import { UserProfileModal } from "@/components/JobSeekerModals/UserProfileModal";
import { ApplicationsModal } from "@/components/JobSeekerModals/ApplicationsModal";
import { InterviewModal } from "@/components/JobSeekerModals/InterviewModal";
import { UpcomingInterviewModal } from "@/components/JobSeekerModals/UpcomingInterviewModal";

import { JobPostingsModal } from "@/components/JobSeekerModals/JobPostingsModal";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<{title: string, id: string} | null>(null);

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

  // Calculate comprehensive profile completion
  const comprehensiveProfileCompletion = calculateComprehensiveProfileCompletion(comprehensiveProfile);
  const profileProgress = comprehensiveProfileCompletion.percentage;
  
  // Check if comprehensive profile has required fields completed (85% threshold for interviews)
  const hasCompleteProfile = comprehensiveProfileCompletion.percentage >= 85;
  const hasCompletedInterview = (profile as any)?.aiProfileGenerated;
  
  // Helper function to calculate comprehensive profile completion
  // This matches the server-side calculation exactly to ensure consistency
  function calculateComprehensiveProfileCompletion(compProfile: any) {
    if (!compProfile) {
      return { percentage: 0, isComplete: false };
    }
    
    let totalPercentage = 0;
    
    // Helper function to check if a value is meaningful (not empty, null, undefined, or just whitespace)
    const hasValue = (val: any): boolean => {
      if (val === null || val === undefined || val === '') return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (typeof val === 'number') return val > 0;
      if (typeof val === 'boolean') return true; // boolean values are always meaningful
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') return Object.keys(val).length > 0;
      return false;
    };
    
    // 1. Personal Details - 15% (Required)
    let personalScore = 0;
    if (hasValue(compProfile.personalDetails?.firstName)) personalScore += 20; // 3%
    if (hasValue(compProfile.personalDetails?.lastName)) personalScore += 20; // 3%
    if (hasValue(compProfile.personalDetails?.email)) personalScore += 20; // 3%
    if (hasValue(compProfile.personalDetails?.phone)) personalScore += 20; // 3%
    if (hasValue(compProfile.personalDetails?.dateOfBirth)) personalScore += 10; // 1.5%
    if (hasValue(compProfile.personalDetails?.nationality)) personalScore += 10; // 1.5%
    totalPercentage += (personalScore / 100) * 15;
    
    // 2. Government ID - 8% (Optional)
    let govIdScore = 0;
    if (hasValue(compProfile.governmentId?.idType)) govIdScore += 40; // 3.2%
    if (hasValue(compProfile.governmentId?.idNumber)) govIdScore += 40; // 3.2%
    if (hasValue(compProfile.governmentId?.expiryDate)) govIdScore += 20; // 1.6%
    totalPercentage += (govIdScore / 100) * 8;
    
    // 3. Links & Portfolio - 6% (Optional)
    let linksScore = 0;
    if (hasValue(compProfile.linksPortfolio?.linkedinUrl)) linksScore += 30; // 1.8%
    if (hasValue(compProfile.linksPortfolio?.githubUrl)) linksScore += 25; // 1.5%
    if (hasValue(compProfile.linksPortfolio?.portfolioUrl)) linksScore += 25; // 1.5%
    if (hasValue(compProfile.linksPortfolio?.personalWebsite)) linksScore += 20; // 1.2%
    totalPercentage += (linksScore / 100) * 6;
    
    // 4. Work Eligibility - 7% (Semi-Required)
    let eligibilityScore = 0;
    if (hasValue(compProfile.workEligibility?.workAuthorization)) eligibilityScore += 40; // 2.8%
    if (hasValue(compProfile.workEligibility?.workArrangement)) eligibilityScore += 30; // 2.1%
    if (compProfile.workEligibility?.willingToRelocate !== undefined && compProfile.workEligibility?.willingToRelocate !== null) eligibilityScore += 15; // 1.05%
    if (hasValue(compProfile.workEligibility?.availabilityDate)) eligibilityScore += 15; // 1.05%
    totalPercentage += (eligibilityScore / 100) * 7;
    
    // 5. Languages - 8% (Required)
    let languageScore = 0;
    const validLanguages = compProfile.languages?.filter((lang: any) => hasValue(lang.language)) || [];
    if (validLanguages.length > 0) {
      languageScore += 70; // 5.6% for having at least one language
      if (validLanguages.length > 1) languageScore += 20; // 1.6% for multiple languages
      if (validLanguages.some((lang: any) => hasValue(lang.certification))) languageScore += 10; // 0.8% for certifications
    }
    totalPercentage += (languageScore / 100) * 8;
    
    // 6. Skills - 12% (Required)
    let skillsScore = 0;
    const validTechSkills = compProfile.skills?.technicalSkills?.filter((skill: any) => hasValue(skill.skill)) || [];
    const validSoftSkills = compProfile.skills?.softSkills?.filter((skill: any) => hasValue(skill.skill)) || [];
    
    if (validTechSkills.length > 0) skillsScore += 50; // 6% for technical skills
    if (validSoftSkills.length > 0) skillsScore += 30; // 3.6% for soft skills
    if (validTechSkills.length >= 3) skillsScore += 10; // 1.2% for multiple tech skills
    if (validSoftSkills.length >= 3) skillsScore += 10; // 1.2% for multiple soft skills
    totalPercentage += (skillsScore / 100) * 12;
    
    // 7. Education - 10% (Required)
    let educationScore = 0;
    const validEducation = compProfile.education?.filter((edu: any) => hasValue(edu.institution)) || [];
    if (validEducation.length > 0) {
      educationScore += 60; // 6% for having education
      if (hasValue(validEducation[0].degree)) educationScore += 25; // 2.5% for degree
      if (hasValue(validEducation[0].fieldOfStudy)) educationScore += 15; // 1.5% for field of study
    }
    totalPercentage += (educationScore / 100) * 10;
    
    // 8. Experience - 15% (Required)
    let experienceScore = 0;
    const validExperience = compProfile.experience?.filter((exp: any) => hasValue(exp.company)) || [];
    if (validExperience.length > 0) {
      experienceScore += 50; // 7.5% for having experience
      if (hasValue(validExperience[0].position)) experienceScore += 20; // 3% for position
      if (hasValue(validExperience[0].responsibilities)) experienceScore += 20; // 3% for responsibilities
      if (validExperience.length > 1) experienceScore += 10; // 1.5% for multiple experiences
    }
    totalPercentage += (experienceScore / 100) * 15;
    
    // 9. Certifications - 5% (Optional)
    let certScore = 0;
    const validCertifications = compProfile.certifications?.filter((cert: any) => hasValue(cert.name)) || [];
    if (validCertifications.length > 0) {
      certScore += 70; // 3.5% for having certifications
      if (validCertifications.length > 1) certScore += 30; // 1.5% for multiple certifications
    }
    totalPercentage += (certScore / 100) * 5;
    
    // 10. Awards - 4% (Optional)
    let awardScore = 0;
    const validAwards = compProfile.awards?.filter((award: any) => hasValue(award.title)) || [];
    if (validAwards.length > 0) {
      awardScore += 80; // 3.2% for having awards
      if (validAwards.length > 1) awardScore += 20; // 0.8% for multiple awards
    }
    totalPercentage += (awardScore / 100) * 4;
    
    // 11. Job Target - 10% (Semi-Required)
    let jobTargetScore = 0;
    const validTargetRoles = compProfile.jobTarget?.targetRoles?.filter((role: string) => hasValue(role)) || [];
    if (validTargetRoles.length > 0) jobTargetScore += 40; // 4% for target roles
    if (hasValue(compProfile.jobTarget?.careerLevel)) jobTargetScore += 20; // 2% for career level
    if (hasValue(compProfile.jobTarget?.salaryExpectations?.minSalary)) jobTargetScore += 15; // 1.5% for salary expectations
    if (hasValue(compProfile.jobTarget?.careerGoals)) jobTargetScore += 15; // 1.5% for career goals
    if (hasValue(compProfile.jobTarget?.workStyle)) jobTargetScore += 10; // 1% for work style
    totalPercentage += (jobTargetScore / 100) * 10;
    
    const percentage = Math.min(Math.round(totalPercentage), 100);
    const isComplete = percentage >= 85;
    
    return { percentage, isComplete };
  }
  
  // Show full dashboard only when BOTH steps are complete: complete profile (including CV) AND AI interview
  const showFullDashboard = hasCompleteProfile && hasCompletedInterview;

  // Show welcome toast only once after completing interview
  useEffect(() => {
    if (showFullDashboard && (profile as any)?.aiProfileGenerated) {
      // Check if we've already shown this toast
      const hasShownWelcomeToast = localStorage.getItem(`welcomeToast_${(user as any)?.id}`);
      
      if (!hasShownWelcomeToast) {
        toast({
          title: "Ready to Find Your Perfect Role! 🎉",
          description: "Your profile is complete and your AI interview has generated a comprehensive professional analysis. Use the tools below to discover opportunities that match your unique skills and career goals.",
          duration: 8000, // Show for 8 seconds
        });
        
        // Mark that we've shown the toast for this user
        localStorage.setItem(`welcomeToast_${(user as any)?.id}`, 'shown');
      }
    }
  }, [showFullDashboard, (profile as any)?.aiProfileGenerated, (user as any)?.id, toast]);

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
                  {(user as any)?.firstName || 'Job Seeker'}
                </span>
              </button>
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {logout.isPending ? 'Signing Out...' : 'Sign Out'}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Plato!</h2>
              <p className="text-gray-600 mb-6">
                Complete both steps below to unlock personalized job matching and access your full dashboard:
              </p>
              
              <div className="space-y-4">
                {/* Step 1: Build Complete Profile (includes CV data) */}
                <div className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  hasCompleteProfile 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        hasCompleteProfile ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {hasCompleteProfile ? '✓' : '1'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Build Your Complete Profile</h3>
                        <p className="text-gray-600">
                          {hasCompleteProfile 
                            ? 'Great! Your profile is ready for interviews (85%+ complete).' 
                            : 'Build your professional profile including personal details, education, work experience, skills, and career preferences. Reach 85% to unlock interviews.'
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
                          hasCompleteProfile 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {hasCompleteProfile ? 'Edit Profile' : 'Build Profile'}
                      </button>
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
                    <div className="flex items-center space-x-4">
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
                        <h3 className="text-lg font-semibold text-gray-900">Take AI Interview</h3>
                        <p className="text-gray-600">
                          {!hasCompleteProfile
                            ? 'Build your profile to 85% completion to unlock the AI interview.' 
                            : hasCompletedInterview 
                              ? 'Excellent! Your AI interview is complete.' 
                              : 'Chat with our AI to create your comprehensive professional analysis based on your profile.'
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

              {/* Upcoming Interview - Always show */}
              <button
                onClick={() => openModal('upcomingInterview')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-bold">Upcoming Interviews</h4>
                      <p className="text-blue-100">
                        {(upcomingInterviews as any[]).length > 0 
                          ? `${(upcomingInterviews as any[]).length} interview${(upcomingInterviews as any[]).length > 1 ? 's' : ''} scheduled`
                          : "Check your interview schedule"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-2xl">→</div>
                </div>
              </button>

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
                    <span className="font-medium text-gray-900">{(matches as any[]).length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-3 w-3 text-purple-600" />
                    <span className="text-gray-600">Applications:</span>
                    <span className="font-medium text-gray-900">{(applications as any[]).length}</span>
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
                  <strong>Step 1:</strong> Build your complete profile including personal details, education, work experience, skills, and career preferences.<br/>
                  <strong>Step 2:</strong> Complete your AI interview to generate your comprehensive professional analysis.
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
      <JobPostingsModal 
        isOpen={activeModal === 'jobPostings'} 
        onClose={closeModal} 
        initialJobTitle={selectedJobDetails?.title}
        initialJobId={selectedJobDetails?.id}
      />
    </div>
  );
}