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
    interviewsUnlocked: "Interviews are now unlocked!",
    continueBuilding: "Continue building to unlock interviews at 85%.",
    
    // Dashboard sections
    jobMatches: "Job Matches",
    applications: "Applications", 
    upcomingInterviews: "Upcoming Interviews",
    
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
    profileDescription: "أنشئ ملفك الشخصي المهني بما في ذلك التفاصيل الشخصية والتعليم وخبرة العمل والمهارات والتفضيلات المهنية. اوصل إلى 85% لفتح المقابلات.",
    interviewDescription: "أنشئ ملفك الشخصي إلى 85% من الاكتمال لفتح مقابلة الذكاء الاصطناعي.",
    
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
    
    // Profile completion
    profileProgress: "تم حفظ تقدم الملف الشخصي!",
    profileComplete: "ملفك الشخصي مكتمل بنسبة {{percentage}}%. {{status}}",
    interviewsUnlocked: "تم فتح المقابلات الآن!",
    continueBuilding: "تابع البناء لفتح المقابلات عند 85%.",
    
    // Dashboard sections
    jobMatches: "الوظائف المناسبة",
    applications: "الطلبات",
    upcomingInterviews: "المقابلات القادمة",
    
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