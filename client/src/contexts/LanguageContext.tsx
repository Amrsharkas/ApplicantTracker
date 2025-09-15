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
    signOut: "Sign Out",
    signingOut: "Signing Out...",
    
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
        title: "Get Your Dream Job with Precision AI Matching",
        subtitle: "Navigate your career journey with intelligent job discovery and AI-powered profile analysis that reveals your true potential.",
        getStarted: "Start Now",
        learnMore: "Learn More"
      },
      features: {
        aiPoweredMatching: "AI-Powered Matching",
        smartInterviews: "Smart Interviews", 
        instantResults: "Instant Results",
        aiInterview: {
          title: "AI Interview",
          description: "Have a natural conversation with our AI to build your professional profile automatically"
        },
        smartMatching: {
          title: "Smart Matching",
          description: "Get matched to jobs with precision scoring based on your skills, experience, and goals"
        },
        instantResultsFeature: {
          title: "Instant Results",
          description: "See your matches immediately with detailed scoring and application tracking"
        }
      },
      companies: {
        title: "Trusted by Leading Companies",
        subtitle: "Join thousands of professionals who have found their perfect career match through our AI-powered platform",
        testimonial: "Revolutionary approach to talent acquisition",
        subtitle2: "Join the companies shaping the future of hiring"
      },
      cta: {
        title: "Ready to find your perfect job match?",
        subtitle: "Join thousands of professionals who've discovered their dream careers with AI-powered job matching",
        startJourney: "Start Your Journey"
      }
    },
    
    // Auth
    auth: {
      signIn: "Sign In",
      signUp: "Sign Up", 
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      firstName: "First Name",
      lastName: "Last Name",
      username: "Username",
      enterEmail: "Enter your email",
      enterPassword: "Enter your password",
      confirmYourPassword: "Confirm your password",
      firstNamePlaceholder: "First name",
      lastNamePlaceholder: "Last name",
      usernamePlaceholder: "Username",
      usernameOptional: "Username (Optional)",
      chooseUsername: "Choose a username",
      createPassword: "Create a password",
      signingIn: "Signing In...",
      signingUp: "Signing Up...",
      createAccount: "Create Account",
      invalidEmail: "Invalid email address",
      passwordRequired: "Password is required",
      passwordMinLength: "Password must be at least 6 characters",
      firstNameRequired: "First name is required",
      lastNameRequired: "Last name is required",
      usernameMinLength: "Username must be at least 3 characters",
      passwordsDontMatch: "Passwords don't match",
      welcomeToPlato: "Welcome to Plato"
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
    
    // Dashboard
    dashboard: {
      invalidFileType: "Invalid File Type",
      invalidFileTypeDescription: "Please upload a PDF or text file.",
      pdfUploadTips: "PDF Upload Tips",
      pdfUploadTipsDescription: "PDF uploaded! For guaranteed auto-population, also try uploading a text (.txt) version of your resume if the PDF extraction doesn't work well.",
      fileTooLarge: "File Too Large",
      fileTooLargeDescription: "Please upload a file smaller than 10MB.",
      resumeProcessedSuccessfully: "Resume Processed Successfully! 🎉",
      resumeProcessedDescription: "Profile auto-populated with {{sections}} sections from your resume.",
      uploadFailed: "Upload Failed",
      uploadFailedDescription: "Failed to process resume. Please try again.",
      editingProfile: "Editing Profile...",
      readyToFindRole: "Ready to Find Your Perfect Role! 🎉",
      readyToFindRoleDescription: "Your profile is complete and your AI interview has generated a comprehensive professional analysis. Use the tools below to discover opportunities that match your unique skills and career goals.",
      completeSteps: "Complete both steps below to unlock personalized job matching and access your full dashboard:",
      uploadResume: "Upload Resume",
      uploading: "Uploading...",
      editProfile: "Edit Profile",
      excellentInterviewComplete: "Excellent! Your AI interview is complete.",
      reviewInterview: "Review Interview",
      jobSpecificAI: "Job specific AI interviews",
      jobSpecificAIDescription: "See job invites tailored for you and practice",
      invitedJobs: "Invited Jobs",
      invitedJobsDescription: "View jobs you're invited to and apply",
      browseJobPostings: "Browse Job Postings",
      getStartedWithPlato: "Get Started with Plato",
      getStartedWithPlatoDescription: "Complete both steps above to unlock your personalized job dashboard with matches, applications, and career insights.",
      step1Description: "Step 1: Build your complete profile including personal details, education, work experience, skills, and career preferences.",
      step2Description: "Step 2: Complete your AI interview to generate your comprehensive professional analysis."
    },
  },
  ar: {
    // Navigation & General
    welcome: "مرحباً بك في بلاتو!",
    buildProfile: "أنشئ ملفك الشخصي الكامل",
    takeInterview: "خذ مقابلة الذكاء الاصطناعي",
    getStarted: "ابدأ مع بلاتو",
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
    signOut: "تسجيل الخروج",
    signingOut: "جاري تسجيل الخروج...",
    
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
    
    // Brand name
    plato: "بلاتو",
    
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
      features: {
        aiPoweredMatching: "المطابقة بالذكاء الاصطناعي",
        smartInterviews: "مقابلات ذكية",
        instantResults: "نتائج فورية",
        aiInterview: {
          title: "مقابلة الذكاء الاصطناعي",
          description: "أجرِ محادثة طبيعية مع الذكاء الاصطناعي لبناء ملفك المهني تلقائياً"
        },
        smartMatching: {
          title: "المطابقة الذكية", 
          description: "احصل على وظائف مطابقة بدقة مع تقييم شامل يعتمد على مهاراتك وخبرتك وأهدافك"
        },
        instantResultsFeature: {
          title: "نتائج فورية",
          description: "اطلع على مطابقاتك فوراً مع تقييم مفصل وتتبع للطلبات"
        }
      },
      companies: {
        title: "موثوق من قبل الشركات الرائدة",
        subtitle: "انضم إلى آلاف المحترفين الذين وجدوا المطابقة المهنية المثالية من خلال منصتنا المدعومة بالذكاء الاصطناعي",
        testimonial: "نهج ثوري في اكتساب المواهب",
        subtitle2: "انضم إلى الشركات التي تشكل مستقبل التوظيف"
      },
      cta: {
        title: "هل أنت مستعد للعثور على وظيفتك المثالية؟",
        subtitle: "انضم إلى آلاف المحترفين الذين اكتشفوا وظائف أحلامهم بمطابقة الذكاء الاصطناعي",
        startJourney: "ابدأ رحلتك"
      }
    },
    
    // Auth
    auth: {
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      username: "اسم المستخدم",
      enterEmail: "أدخل بريدك الإلكتروني",
      enterPassword: "أدخل كلمة المرور",
      confirmYourPassword: "أكد كلمة المرور",
      firstNamePlaceholder: "الاسم الأول",
      lastNamePlaceholder: "اسم العائلة",
      usernamePlaceholder: "اسم المستخدم",
      usernameOptional: "اسم المستخدم (اختياري)",
      chooseUsername: "اختر اسم المستخدم",
      createPassword: "أنشئ كلمة مرور",
      signingIn: "جاري تسجيل الدخول...",
      signingUp: "جاري إنشاء الحساب...",
      createAccount: "إنشاء حساب",
      invalidEmail: "عنوان بريد إلكتروني غير صحيح",
      passwordRequired: "كلمة المرور مطلوبة",
      passwordMinLength: "يجب أن تكون كلمة المرور ٦ أحرف على الأقل",
      firstNameRequired: "الاسم الأول مطلوب",
      lastNameRequired: "اسم العائلة مطلوب",
      usernameMinLength: "يجب أن يكون اسم المستخدم ٣ أحرف على الأقل",
      passwordsDontMatch: "كلمات المرور غير متطابقة",
      welcomeToPlato: "أهلاً بك في بلاتو"
    },
    
    // Dashboard
    dashboard: {
      invalidFileType: "نوع ملف غير صالح",
      invalidFileTypeDescription: "يرجى رفع ملف PDF أو نصي.",
      pdfUploadTips: "نصائح رفع PDF",
      pdfUploadTipsDescription: "تم رفع PDF! للحصول على التعبئة التلقائية التامة، جرب أيضاً رفع نسخة نصية (.txt) من سيرتك الذاتية إذا لم يعمل استخراج PDF بشكل جيد.",
      fileTooLarge: "ملف كبير جداً",
      fileTooLargeDescription: "يرجى رفع ملف أصغر من 10 ميجابايت.",
      resumeProcessedSuccessfully: "تم معالجة السيرة الذاتية بنجاح! 🎉",
      resumeProcessedDescription: "تم ملء الملف الشخصي تلقائياً بـ {{sections}} من أقسام سيرتك الذاتية.",
      uploadFailed: "فشل الرفع",
      uploadFailedDescription: "فشل معالجة السيرة الذاتية. يرجى المحاولة مرة أخرى.",
      editingProfile: "جاري تعديل الملف الشخصي...",
      readyToFindRole: "جاري البحث عن دورك المثالي! 🎉",
      readyToFindRoleDescription: "ملفك الشخصي مكتمل ومقابلة الذكاء الاصطناعي قد أنشأت تحليلاً مهنياً شاملاً. استخدم الأدوات أدناه لاكتشاف الفرص التي تتوافق مع مهاراتك وأهدافك المهنية الفريدة.",
      completeSteps: "أكمل الخطوتين التاليتين لفتح المطابقة الوظيفية المخصصة والوصول إلى لوحة التحكم الكاملة:",
      uploadResume: "رفع السيرة الذاتية",
      uploading: "جاري الرفع...",
      editProfile: "تعديل الملف الشخصي",
      excellentInterviewComplete: "ممتاز! مقابلة الذكاء الاصطناعي مكتملة.",
      reviewInterview: "مراجعة المقابلة",
      jobSpecificAI: "مقابلات الذكاء الاصطناعي الخاصة بالوظائف",
      jobSpecificAIDescription: "شاهد دعوات وظيفية مخصصة لك وتمرن عليها",
      invitedJobs: "الوظائف المدعوة إليها",
      invitedJobsDescription: "شاهد الوظائف التي تمت دعوتك إليها وتقدم لها",
      browseJobPostings: "تصفح الوظائف المعلنة",
      getStartedWithPlato: "ابدأ مع بلاتو",
      getStartedWithPlatoDescription: "أكمل الخطوتين أعلاه لفتح لوحة تحكم وظيفية مخصصة مع المطابقات والطلبات والرؤى المهنية.",
      step1Description: "الخطوة 1: أنشئ ملفك الشخصي الكامل بما في التفاصيل الشخصية والتعليم وخبرة العمل والمهارات والتفضيلات المهنية.",
      step2Description: "الخطوة 2: أكمل مقابلة الذكاء الاصطناعي لإنشاء تحليلك المهني الشامل."
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