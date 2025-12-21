import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, Zap, CheckCircle, Briefcase, MapPin, Calendar, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthModal } from "@/components/AuthModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Import logo
import logo from "@assets/logo.png";

// Import company logos
import moderatorLogo from "@assets/image_1752003560205.png";
import quantaLogo from "@assets/image_1752003568386.png";
import impleLogo from "@assets/image_1752003573875.png";
import neuroLogo from "@assets/image_1752003578397.png";
import polygonLogo from "@assets/image_1752003581991.png";
import groveLogo from "@assets/image_1752003586635.png";
import melaniteLogo from "@assets/image_1752003591909.png";

// Company logos data
const companyLogos = [
  { name: "Moderator", logo: moderatorLogo },
  { name: "Quanta", logo: quantaLogo },
  { name: "Imple", logo: impleLogo },
  { name: "Neuro", logo: neuroLogo },
  { name: "Polygon", logo: polygonLogo },
  { name: "Grove", logo: groveLogo },
  { name: "Melanite", logo: melaniteLogo }
];

interface PublicJobPosting {
  recordId?: string;
  id: number;
  title: string;
  description: string;
  requirements?: string;
  location?: string | null;
  salaryRange?: string | null;
  employmentType?: string | null;
  workplaceType?: string | null;
  seniorityLevel?: string | null;
  industry?: string | null;
  experienceLevel?: string | null;
  skills?: string[] | null;
  postedAt?: string | null;
  companyName?: string | null;
  jobType?: string | null;
}

function FeaturedJobsSection({
  t,
  language,
  onOpenAuthModal,
  navigate,
}: {
  t: (key: string) => string;
  language: string;
  onOpenAuthModal: () => void;
  navigate: (path: string) => void;
}) {
  const MAX_JOBS_DISPLAY = 6;
  const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/job-postings?limit=6`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        if (isMounted) {
          setJobs(Array.isArray(data) ? data : []);
          setHasError(false);
        }
      } catch (error) {
        if (!controller.signal.aborted && isMounted) {
          console.error('Failed to load public job postings:', error);
          setHasError(true);
          setJobs([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const formatPostedDate = (value?: string | null) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return "";
    }
  };

  const getDescriptionPreview = (description: string) => {
    const cleanDescription = description.replace(/[#*_`>\-]/g, "").replace(/\s+/g, " ").trim();
    if (cleanDescription.length <= 200) {
      return cleanDescription;
    }
    return `${cleanDescription.slice(0, 200)}…`;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 shadow-xs animate-pulse space-y-4"
            >
              <div className="h-6 w-3/4 rounded-lg bg-slate-200" />
              <div className="h-4 w-1/2 rounded-lg bg-slate-200" />
              <div className="h-20 rounded-lg bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-200" />
                <div className="h-6 w-16 rounded-full bg-slate-200" />
              </div>
              <div className="h-4 w-1/3 rounded-lg bg-slate-200" />
            </div>
          ))}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-6 text-red-600">
            {t('landing.jobs.error')}
          </div>
          <div>
            <Button
              onClick={onOpenAuthModal}
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-300 px-6 py-3 text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600"
            >
              {t('landing.jobs.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (jobs.length === 0) {
      return (
        <div className="space-y-6 text-center">
          <Card className="border-0 bg-white/70 shadow-xs">
            <CardContent className="p-8 text-center text-slate-600">
              {t('landing.jobs.empty')}
            </CardContent>
          </Card>
          <div>
            <Button
              onClick={onOpenAuthModal}
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-300 px-6 py-3 text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600"
            >
              {t('landing.jobs.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    const visibleJobs = jobs.slice(0, MAX_JOBS_DISPLAY);

    return (
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {visibleJobs.map((job, index) => {
          const badges = [job.employmentType, job.workplaceType, job.industry]
            .filter((value): value is string => Boolean(value));
          const postedDate = formatPostedDate(job.postedAt);

          return (
            <motion.div
              key={job.recordId || job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="group h-full border-0 bg-white/70 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="flex h-full flex-col gap-6 p-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-800">
                          {job.title}
                        </h3>
                        {job.companyName && (
                          <p className="text-sm text-slate-500">
                            {job.companyName}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        size="sm"
                        className="bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md hover:from-blue-700 hover:to-purple-700"
                      >
                        View Details
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600">
                      {getDescriptionPreview(job.description)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <Badge
                        key={badge}
                        variant="secondary"
                        className="rounded-full bg-blue-50 text-blue-700"
                      >
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {badge}
                        </span>
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    {postedDate && (
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('landing.jobs.posted')} {postedDate}
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {job.location?.trim() || t('landing.jobs.locationUnknown')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={onOpenAuthModal}
            variant="outline"
            className="group inline-flex items-center gap-2 rounded-full border-2 border-slate-300 px-6 py-3 text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600"
          >
            {t('landing.jobs.viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <section className="mt-20 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 text-center"
      >
        <h2 className="text-4xl font-bold text-slate-800">
          {t('landing.jobs.title')}
        </h2>
        <p className="mx-auto max-w-3xl text-lg text-slate-600">
          {t('landing.jobs.subtitle')}
        </p>
      </motion.div>

      {renderContent()}
    </section>
  );
}

// Carousel component
function CompanyCarousel({ t }: { t: (key: string) => string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % companyLogos.length);
    }, 5000); // Change every 5 seconds (slower)

    return () => clearInterval(interval);
  }, []);

  const getPrevIndex = () => (currentIndex - 1 + companyLogos.length) % companyLogos.length;
  const getNextIndex = () => (currentIndex + 1) % companyLogos.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="text-center space-y-8 py-16"
    >
      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-slate-800">
          {t('landing.companies.title')}
        </h2>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto">
          {t('landing.companies.subtitle')}
        </p>
      </div>

      {/* 3D Carousel with Podium Effect */}
      <div className="relative w-full h-80 flex items-center justify-center perspective-1000 mb-8">
        <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
          {/* Left Logo */}
          <motion.div
            key={`left-${getPrevIndex()}`}
            initial={{ opacity: 0, scale: 0.6, x: -50 }}
            animate={{ opacity: 0.4, scale: 0.6, x: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute left-8 top-1/2 transform -translate-y-1/2 z-10"
          >
            <div className="w-40 h-28 flex items-center justify-center">
              <img
                src={companyLogos[getPrevIndex()].logo}
                alt={companyLogos[getPrevIndex()].name}
                className="max-w-full max-h-full object-contain grayscale-50"
              />
            </div>
          </motion.div>

          {/* Center Logo (Main Focus) */}
          <motion.div
            key={`center-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="relative z-20 flex items-center justify-center"
          >
            <div className="company-carousel w-96 h-64 p-16 flex items-center justify-center">
              <img
                src={companyLogos[currentIndex].logo}
                alt={companyLogos[currentIndex].name}
                className="company-logo max-w-full max-h-full object-contain"
              />
            </div>
          </motion.div>

          {/* Right Logo */}
          <motion.div
            key={`right-${getNextIndex()}`}
            initial={{ opacity: 0, scale: 0.6, x: 50 }}
            animate={{ opacity: 0.4, scale: 0.6, x: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 z-10"
          >
            <div className="w-40 h-28 flex items-center justify-center">
              <img
                src={companyLogos[getNextIndex()].logo}
                alt={companyLogos[getNextIndex()].name}
                className="max-w-full max-h-full object-contain grayscale-50"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex justify-center space-x-3 rtl:space-x-reverse mt-4">
        {companyLogos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`carousel-dot w-3 h-3 rounded-full ${
              index === currentIndex 
                ? 'active w-10' 
                : 'bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      <div className="text-center space-y-3">
        <p className="text-slate-700 font-semibold text-xl">
          "{t('landing.companies.testimonial')}"
        </p>
        <p className="text-slate-500 text-base">
          {t('landing.companies.subtitle2')}
        </p>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { t, isRTL, language } = useLanguage();
  const [, navigate] = useLocation();

  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <div className={`min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="floating-element absolute top-20 left-10 w-32 h-32 bg-linear-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute top-1/2 right-20 w-24 h-24 bg-linear-to-br from-green-400/20 to-teal-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-20 left-1/3 w-40 h-40 bg-linear-to-br from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center"
            >
              <img
                src={logo}
                alt="Plato"
                className="h-10 w-auto"
              />
            </motion.div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <LanguageSwitcher />
              <Button 
                onClick={openAuthModal}
                className="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl font-medium"
              >
                {t('auth.signIn')}
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            
            {/* Left Column - Hero Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight"
                >
{t('landing.hero.title')}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-slate-600 leading-relaxed"
                >
{t('landing.hero.subtitle')}
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button 
                  onClick={openAuthModal}
                  size="lg"
                  className="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
{t('landing.hero.getStarted')}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg"
                >
{t('landing.hero.learnMore')}
                </Button>
              </motion.div>

              {/* Feature highlights */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-6 pt-4"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{t('landing.features.aiPoweredMatching')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{t('landing.features.smartInterviews')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{t('landing.features.instantResults')}</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Feature Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="glass-card transition-all duration-300 hover:shadow-2xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-linear-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">{t('landing.features.aiInterview.title')}</h3>
                        <p className="text-slate-600">
                          {t('landing.features.aiInterview.description')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="glass-card transition-all duration-300 hover:shadow-2xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-linear-to-r from-green-500 to-teal-500 flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">{t('landing.features.smartMatching.title')}</h3>
                        <p className="text-slate-600">
                          {t('landing.features.smartMatching.description')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card className="glass-card transition-all duration-300 hover:shadow-2xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-linear-to-r from-orange-500 to-red-500 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">{t('landing.features.instantResultsFeature.title')}</h3>
                        <p className="text-slate-600">
                          {t('landing.features.instantResultsFeature.description')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          <FeaturedJobsSection
            t={t}
            language={language}
            onOpenAuthModal={openAuthModal}
            navigate={navigate}
          />

          {/* Company Carousel Section */}
          <CompanyCarousel t={t} />

          {/* Bottom CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center mt-20 space-y-6"
          >
            <h2 className="text-3xl font-bold text-slate-800">
              {t('landing.cta.title')}
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              {t('landing.cta.subtitle')}
            </p>
            <Button 
              onClick={openAuthModal}
              size="lg"
              className="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-xl font-semibold text-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t('landing.cta.startJourney')}
            </Button>
          </motion.div>
        </main>
      </div>
      
      {/* Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
      />
    </div>
  );
}
