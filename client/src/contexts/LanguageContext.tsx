import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    // Navigation & General
    welcome: "Welcome to Plato!",
    buildProfile: "Build Your Complete Profile",
    takeInterview: "Take AI Interview",
    getStarted: "Get Started with Plato",
    complete: "Complete",
    startInterview: "Start Interview",
    buildProfileButton: "Build Profile",
    
    // Profile Section
    profileDescription: "Build your professional profile including personal details, education, work experience, skills, and career preferences. Reach 85% to unlock interviews.",
    interviewDescription: "Build your profile to 85% completion to unlock the AI interview.",
    
    // Steps
    step1: "Build your complete profile including personal details, education, work experience, skills, and career preferences.",
    step2: "Complete your AI interview to generate your comprehensive professional analysis.",
    
    // Common buttons
    save: "Save",
    cancel: "Cancel",
    continue: "Continue",
    next: "Next",
    previous: "Previous",
    close: "Close",
    
    // Interview specific
    selectLanguage: "Select Interview Language",
    interviewLanguagePrompt: "Which language would you like to take the interview in?",
    english: "English",
    arabic: "العربية",
    proceedInEnglish: "Proceed in English",
    proceedInArabic: "Proceed in Arabic",
    chooseStyle: "Choose Your Interview Style",
    selectExperience: "Interview - Select how you'd like to experience your AI interview",
    languageNote: "The AI interviewer will ask questions and expect responses in your selected language",
    
    // Profile completion
    profileProgress: "Profile progress saved!",
    profileComplete: "Your profile is {{percentage}}% complete. {{status}}",
    interviewsUnlocked: "Great! Your profile is ready for interviews (75%+ complete).",
    continueBuilding: "Continue building to unlock interviews at 75%.",
    
    // Dashboard
    jobDashboard: "Your Job Dashboard",
    
    // Dashboard sections
    jobMatches: "Job Matches",
    applications: "Applications", 
    upcomingInterviews: "Upcoming Interviews",
    jobPostings: "Job Postings",
    
    // Dashboard content
    aiCuratedOpportunities: "AI-Curated Opportunities",
    discoverPersonalizedJobs: "Discover personalized job matches based on your AI interview analysis and profile data",
    trackApplicationProgress: "Track Application Progress",
    monitorApplicationStatus: "Monitor your job applications and interview schedules across all platforms",
    exploreOpportunities: "Explore New Opportunities",
    browseLatestJobs: "Browse the latest job openings that match your skills and career goals",
    viewUpcomingSchedule: "View Your Upcoming Schedule",
    stayUpdated: "Stay updated with your confirmed interviews and important dates",
    
    // Stats and labels
    responseRate: "response rate",
    applicationResponseRate: "application response rate",
    whyJobSeekingChallenging: "Why Job Seeking Is So Challenging",
    
    // Common actions
    viewAll: "View All",
    noDataAvailable: "No data available",
    loadingData: "Loading data...",
    
    // Applications section
    myApplications: "My Applications",
    trackApplicationStatus: "Track your application status and progress",
    
    // Quick stats
    quickStats: "Quick Stats",
    jobMatchesLabel: "Job Matches",
    applicationsLabel: "Applications",
    profileCompletionLabel: "Profile Completion",
    
    // Industry challenge stats
    avgJobSearchTime: "average job search time",
    applicationsToGetOffer: "applications to get one offer",
    sixMonths: "6 months",
    oneHundredEighteen: "118",
    twoPercent: "2%",
    
    // Forms
    personalDetails: "Personal Details",
    workExperience: "Work Experience",
    education: "Education",
    skills: "Skills",
    jobTarget: "Job Target",
    
    // Language switch
    switchLanguage: "العربية",
    
    // Landing page
    landing: {
      hero: {
        title: "Find Your Dream Job with AI-Powered Precision",
        subtitle: "Transform your career journey with intelligent job matching and comprehensive AI interviews that showcase your true potential.",
        getStarted: "Get Started",
        learnMore: "Learn More"
      },
      companies: {
        title: "Trusted by Leading Companies",
        subtitle: "Join thousands of professionals who have found their perfect career match through our AI-powered platform"
      }
    },
    
    // Auth
    auth: {
      signIn: "Sign In"
    },
    
    // Interview Modal
    interview: {
      chooseStyle: "Choose Interview Style",
      selectExperience: "Select Interview Type",
      selectLanguage: "Select Interview Language",
      languageNote: "The AI interviewer will ask questions and expect responses in the language you select"
    },
    
    // Interview Types
    voiceInterview: "Voice Interview",
    textInterview: "Text Interview",
    startingVoiceInterview: "Starting voice interview...",
    speakNaturally: "Speak naturally with the AI interviewer",
    
    // Languages
    languages: {
      english: "English",
      arabic: "العربية"
    },
  },
  ar: {
    // Navigation & General
    welcome: "مرحباً بك في أفلاطون!",
    buildProfile: "أنشئ ملفك الشخصي الكامل",
    takeInterview: "خذ مقابلة الذكاء الاصطناعي",
    getStarted: "ابدأ مع أفلاطون",
    complete: "مكتمل",
    startInterview: "ابدأ المقابلة",
    buildProfileButton: "أنشئ الملف الشخصي",
    
    // Profile Section
    profileDescription: "أنشئ ملفك الشخصي المهني بما في ذلك التفاصيل الشخصية والتعليم وخبرة العمل والمهارات والتفضيلات المهنية. اوصل إلى 75% لفتح المقابلات.",
    interviewDescription: "أنشئ ملفك الشخصي إلى 75% من الاكتمال لفتح مقابلة الذكاء الاصطناعي.",
    
    // Steps
    step1: "أنشئ ملفك الشخصي الكامل بما في ذلك التفاصيل الشخصية والتعليم وخبرة العمل والمهارات والتفضيلات المهنية.",
    step2: "أكمل مقابلة الذكاء الاصطناعي لإنشاء تحليلك المهني الشامل.",
    
    // Common buttons
    save: "حفظ",
    cancel: "إلغاء",
    continue: "متابعة",
    next: "التالي",
    previous: "السابق",
    close: "إغلاق",
    
    // Interview specific
    selectLanguage: "اختر لغة المقابلة",
    interviewLanguagePrompt: "بأي لغة تريد إجراء المقابلة؟",
    english: "English",
    arabic: "العربية",
    proceedInEnglish: "متابعة بالإنجليزية",
    proceedInArabic: "متابعة بالعربية",
    chooseStyle: "اختر أسلوب المقابلة",
    selectExperience: "المقابلة - اختر كيف تريد خوض تجربة مقابلة الذكاء الاصطناعي",
    languageNote: "سيطرح المحاور الذكي الأسئلة ويتوقع الإجابات باللغة التي اخترتها",
    
    // Interview Modal
    interview: {
      chooseStyle: "اختر أسلوب المقابلة",
      selectExperience: "اختر نوع المقابلة",
      selectLanguage: "اختر لغة المقابلة",
      languageNote: "سيطرح المحاور الذكي الأسئلة ويتوقع الإجابات باللغة التي اخترتها"
    },
    
    // Interview Types
    voiceInterview: "مقابلة صوتية",
    textInterview: "مقابلة نصية",
    startingVoiceInterview: "بدء المقابلة الصوتية...",
    speakNaturally: "تحدث بطبيعية مع المحاور الذكي",
    
    // Languages
    languages: {
      english: "English",
      arabic: "العربية"
    },
    
    // Profile completion
    profileProgress: "تم حفظ تقدم الملف الشخصي!",
    profileComplete: "ملفك الشخصي مكتمل بنسبة {{percentage}}%. {{status}}",
    interviewsUnlocked: "رائع! ملفك الشخصي جاهز للمقابلات (مكتمل 75%+).",
    continueBuilding: "تابع البناء لفتح المقابلات عند 75%.",
    
    // Dashboard
    jobDashboard: "لوحة الوظائف الخاصة بك",
    
    // Dashboard sections
    jobMatches: "الوظائف المناسبة",
    applications: "الطلبات",
    upcomingInterviews: "المقابلات القادمة",
    jobPostings: "الوظائف المتاحة",
    
    // Dashboard content
    aiCuratedOpportunities: "الفرص المختارة بالذكاء الاصطناعي",
    discoverPersonalizedJobs: "اكتشف الوظائف المخصصة لك بناءً على تحليل مقابلة الذكاء الاصطناعي وبيانات ملفك الشخصي",
    trackApplicationProgress: "تتبع تقدم الطلبات",
    monitorApplicationStatus: "راقب طلبات العمل ومواعيد المقابلات عبر جميع المنصات",
    exploreOpportunities: "استكشف الفرص الجديدة",
    browseLatestJobs: "تصفح أحدث الوظائف المتاحة التي تناسب مهاراتك وأهدافك المهنية",
    viewUpcomingSchedule: "اعرض جدولك القادم",
    stayUpdated: "ابق محدثاً بمقابلاتك المؤكدة والتواريخ المهمة",
    
    // Stats and labels
    responseRate: "معدل الرد",
    applicationResponseRate: "معدل الرد على الطلبات",
    whyJobSeekingChallenging: "لماذا البحث عن عمل صعب للغاية؟",
    
    // Common actions
    viewAll: "عرض الكل",
    noDataAvailable: "لا توجد بيانات متاحة",
    loadingData: "جاري تحميل البيانات...",
    
    // Applications section
    myApplications: "طلباتي",
    trackApplicationStatus: "تتبع حالة وتقدم طلباتك",
    
    // Quick stats
    quickStats: "إحصائيات سريعة",
    jobMatchesLabel: "الوظائف المناسبة",
    applicationsLabel: "الطلبات",
    profileCompletionLabel: "اكتمال الملف",
    
    // Industry challenge stats
    avgJobSearchTime: "متوسط وقت البحث عن عمل",
    applicationsToGetOffer: "طلب للحصول على عرض واحد",
    sixMonths: "٦ أشهر",
    oneHundredEighteen: "١١٨",
    twoPercent: "٢٪",
    
    // Forms
    personalDetails: "التفاصيل الشخصية",
    workExperience: "خبرة العمل",
    education: "التعليم",
    skills: "المهارات",
    jobTarget: "الهدف الوظيفي",
    
    // Language switch
    switchLanguage: "English",
    
    // Landing page
    landing: {
      hero: {
        title: "اعثر على وظيفة أحلامك بدقة الذكاء الاصطناعي",
        subtitle: "حوّل رحلتك المهنية مع المطابقة الذكية للوظائف ومقابلات الذكاء الاصطناعي الشاملة التي تُظهر إمكاناتك الحقيقية.",
        getStarted: "ابدأ الآن",
        learnMore: "اعرف المزيد"
      },
      companies: {
        title: "موثوق من قبل الشركات الرائدة",
        subtitle: "انضم إلى آلاف المحترفين الذين وجدوا المطابقة المهنية المثالية من خلال منصتنا المدعومة بالذكاء الاصطناعي"
      }
    },
    
    // Auth
    auth: {
      signIn: "تسجيل الدخول"
    },
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('plato-language');
    return (saved as Language) || 'en';
  });

  const isRTL = language === 'ar';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('plato-language', lang);
    
    // Update document direction and language
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let translation: any = translations[language];
    
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        return key; // Return the key if translation not found
      }
    }
    
    return typeof translation === 'string' ? translation : key;
  };

  // Set initial direction and language on mount
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}