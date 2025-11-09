import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  DollarSign,
  Users,
  GraduationCap,
  Globe,
  CheckCircle2,
  Award,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";

interface JobDetails {
  recordId?: string;
  id: number;
  title: string;
  description: string;
  requirements: string;
  location?: string | null;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNegotiable?: boolean | null;
  employmentType?: string | null;
  workplaceType?: string | null;
  seniorityLevel?: string | null;
  industry?: string | null;
  experienceLevel?: string | null;
  skills?: string[] | null;
  softSkills?: string[] | null;
  technicalSkills?: string[] | null;
  benefits?: string | null;
  certifications?: string | null;
  languagesRequired?: any;
  interviewLanguage?: string | null;
  postedAt?: string | null;
  companyName?: string | null;
  jobType?: string | null;
  is_active?: boolean;
  views?: number;
}

export default function JobDetailsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { t, language } = useLanguage();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobId = params.id;

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadJobDetails = async () => {
      if (!jobId) {
        setError("Invalid job ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/public/job-postings/${jobId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Job not found");
          }
          throw new Error("Failed to load job details");
        }

        const data = await response.json();
        if (isMounted) {
          setJob(data);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted && isMounted) {
          console.error("Failed to load job details:", err);
          setError(err instanceof Error ? err.message : "Failed to load job details");
          setJob(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadJobDetails();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [jobId]);

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
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return "";
    }
  };

  const formatSalary = () => {
    if (job?.salaryRange) {
      return job.salaryRange;
    }
    if (job?.salaryMin && job?.salaryMax) {
      return `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`;
    }
    if (job?.salaryMin) {
      return `From $${job.salaryMin.toLocaleString()}`;
    }
    if (job?.salaryMax) {
      return `Up to $${job.salaryMax.toLocaleString()}`;
    }
    return "Competitive salary";
  };

  const handleApply = () => {
    // Navigate to landing page with auth modal
    navigate("/?action=apply&jobId=" + jobId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-32 rounded-lg bg-slate-200" />
            <div className="space-y-4">
              <div className="h-12 w-3/4 rounded-lg bg-slate-200" />
              <div className="h-6 w-1/2 rounded-lg bg-slate-200" />
              <div className="flex gap-4">
                <div className="h-10 w-32 rounded-full bg-slate-200" />
                <div className="h-10 w-32 rounded-full bg-slate-200" />
                <div className="h-10 w-32 rounded-full bg-slate-200" />
              </div>
            </div>
            <div className="h-64 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <Card className="border-red-200 bg-red-50/80">
            <CardContent className="p-8 text-center">
              <p className="text-red-600 text-lg font-medium mb-4">
                {error || "Job not found"}
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allSkills = [
    ...(job.skills || []),
    ...(job.technicalSkills || []),
    ...(job.softSkills || []),
  ].filter((skill, index, self) => self.indexOf(skill) === index);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="mb-6 gap-2 hover:bg-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </motion.div>

        {/* Job header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-0 bg-white/70 shadow-lg backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Title and company */}
                <div>
                  <h1 className="text-4xl font-bold text-slate-800 mb-2">
                    {job.title}
                  </h1>
                  {job.companyName && (
                    <div className="flex items-center gap-2 text-xl text-slate-600">
                      <Building2 className="h-5 w-5" />
                      {job.companyName}
                    </div>
                  )}
                </div>

                {/* Key details badges */}
                <div className="flex flex-wrap gap-3">
                  {job.employmentType && (
                    <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700 px-4 py-2 text-sm">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {job.employmentType}
                    </Badge>
                  )}
                  {job.workplaceType && (
                    <Badge variant="secondary" className="rounded-full bg-purple-50 text-purple-700 px-4 py-2 text-sm">
                      <Globe className="h-4 w-4 mr-2" />
                      {job.workplaceType}
                    </Badge>
                  )}
                  {job.experienceLevel && (
                    <Badge variant="secondary" className="rounded-full bg-green-50 text-green-700 px-4 py-2 text-sm">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      {job.experienceLevel}
                    </Badge>
                  )}
                  {job.seniorityLevel && (
                    <Badge variant="secondary" className="rounded-full bg-orange-50 text-orange-700 px-4 py-2 text-sm">
                      <Users className="h-4 w-4 mr-2" />
                      {job.seniorityLevel}
                    </Badge>
                  )}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                  {job.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Posted {formatPostedDate(job.postedAt)}
                    </span>
                  )}
                  {job.industry && (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {job.industry}
                    </span>
                  )}
                </div>

                {/* Apply button */}
                <div className="pt-4">
                  <Button
                    onClick={handleApply}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700 px-8"
                  >
                    Apply for this Position
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Job details sections */}
        <div className="space-y-6">
          {/* Salary */}
          {(job.salaryRange || job.salaryMin || job.salaryMax) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h2 className="text-xl font-semibold text-slate-800">Salary</h2>
                  </div>
                  <p className="text-lg text-slate-700">
                    {formatSalary()}
                    {job.salaryNegotiable && (
                      <span className="text-sm text-slate-500 ml-2">(Negotiable)</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                  Job Description
                </h2>
                <div className="prose prose-slate max-w-none text-slate-700">
                  <ReactMarkdown>{job.description}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Requirements */}
          {job.requirements && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                    Requirements
                  </h2>
                  <div className="prose prose-slate max-w-none text-slate-700">
                    <ReactMarkdown>{job.requirements}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Skills */}
          {allSkills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <h2 className="text-2xl font-semibold text-slate-800">
                      Required Skills
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-300 px-3 py-1"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Benefits */}
          {job.benefits && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                    Benefits
                  </h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {job.benefits}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Additional information */}
          {(job.certifications || job.languagesRequired || job.interviewLanguage) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                    Additional Information
                  </h2>
                  <div className="space-y-4">
                    {job.certifications && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-slate-600" />
                          <h3 className="font-medium text-slate-700">Certifications</h3>
                        </div>
                        <p className="text-slate-600 ml-6">{job.certifications}</p>
                      </div>
                    )}
                    {job.interviewLanguage && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Languages className="h-4 w-4 text-slate-600" />
                          <h3 className="font-medium text-slate-700">Interview Language</h3>
                        </div>
                        <p className="text-slate-600 ml-6">{job.interviewLanguage}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Bottom apply button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 mb-12"
        >
          <Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Apply?
              </h3>
              <p className="text-blue-50 mb-6 max-w-2xl mx-auto">
                Join our team and make an impact. Click the button below to start your application process.
              </p>
              <Button
                onClick={handleApply}
                size="lg"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 shadow-lg"
              >
                Apply Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
