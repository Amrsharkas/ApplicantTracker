/**
 * Extracts interview language from job data and normalizes it to the expected format
 * @param job - Job object with optional interviewLanguage field
 * @param fallbackLanguage - Default language to use if job doesn't specify one
 * @returns 'english' | 'arabic' - The normalized interview language
 */
export const getInterviewLanguage = (
  job: { interviewLanguage?: string } | null,
  fallbackLanguage: 'english' | 'arabic'
): 'english' | 'arabic' => {
  if (job?.interviewLanguage) {
    const jobLanguage = job.interviewLanguage.toLowerCase().trim();

    // Handle various possible language formats
    if (jobLanguage === 'arabic' || jobLanguage === 'ar' || jobLanguage === 'العربية') {
      return 'arabic';
    }
    if (jobLanguage === 'english' || jobLanguage === 'en' || jobLanguage === 'eng') {
      return 'english';
    }
  }

  return fallbackLanguage;
};

/**
 * Gets the display name for a language
 * @param language - Language code
 * @returns Human readable language name
 */
export const getLanguageDisplayName = (language: 'english' | 'arabic'): string => {
  return language === 'arabic' ? 'Arabic' : 'English';
};