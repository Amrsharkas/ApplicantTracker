import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  User, ArrowLeft, MapPin, GraduationCap, Briefcase, Award, Settings, Globe,
  Upload, Plus, X, Shield, Languages, Target, Star, Check, Clock, Save,
  Calendar, Phone, Mail, Home, AlertCircle, FileText, Link as LinkIcon
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

// Comprehensive profile schema covering all 11 sections
const comprehensiveProfileSchema = z.object({
  // 1. Personal Details
  personalDetails: z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say", "other"]).optional(),
    nationality: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    }).optional(),
    emergencyContact: z.object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
  }),

  // 2. Government ID Submission
  governmentId: z.object({
    idType: z.enum(["passport", "national-id", "driving-license", "other"]).optional(),
    idNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    issuingAuthority: z.string().optional(),
    verified: z.boolean().default(false),
  }).optional(),

  // 3. Links & Portfolio
  linksPortfolio: z.object({
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    githubUrl: z.string().url().optional().or(z.literal("")),
    portfolioUrl: z.string().url().optional().or(z.literal("")),
    personalWebsite: z.string().url().optional().or(z.literal("")),
    behanceUrl: z.string().url().optional().or(z.literal("")),
    dribbbleUrl: z.string().url().optional().or(z.literal("")),
    otherLinks: z.array(z.object({
      platform: z.string(),
      url: z.string().url(),
    })).optional(),
  }).optional(),

  // 4. Work Eligibility & Preferences
  workEligibility: z.object({
    workAuthorization: z.enum(["citizen", "permanent-resident", "work-visa", "student-visa", "other"]).optional(),
    visaStatus: z.string().optional(),
    visaExpiryDate: z.string().optional(),
    sponsorshipRequired: z.boolean().optional(),
    willingToRelocate: z.boolean().optional(),
    preferredLocations: z.array(z.string()).optional(),
    workArrangement: z.enum(["onsite", "remote", "hybrid", "flexible"]).optional(),
    availabilityDate: z.string().optional(),
    noticePeriod: z.string().optional(),
    travelWillingness: z.enum(["none", "minimal", "moderate", "extensive"]).optional(),
  }).optional(),

  // 5. Languages
  languages: z.array(z.object({
    language: z.string().optional(),
    proficiency: z.enum(["basic", "conversational", "fluent", "native"]),
    certification: z.string().optional(),
  })).optional(),

  // 6. Skills
  skills: z.object({
    technicalSkills: z.array(z.object({
      skill: z.string().optional(),
      level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
      yearsOfExperience: z.number().min(0).optional(),
    })).optional(),
    softSkills: z.array(z.object({
      skill: z.string().optional(),
      level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    })).optional(),
    industryKnowledge: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
  }),

  // 7. Education (repeatable)
  education: z.array(z.object({
    institution: z.string().optional(),
    degree: z.string().optional(),
    fieldOfStudy: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    gpa: z.string().optional(),
    honors: z.string().optional(),
    relevantCoursework: z.string().optional(),
    thesis: z.string().optional(),
    location: z.string().optional(),
  })).optional(),

  // 8. Experience (repeatable)
  experience: z.array(z.object({
    company: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    employmentType: z.enum(["full-time", "part-time", "contract", "freelance", "internship"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    location: z.string().optional(),
    responsibilities: z.string().optional(),
    achievements: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    teamSize: z.number().optional(),
    reportingTo: z.string().optional(),
    salary: z.object({
      amount: z.number().optional(),
      currency: z.string().default("EGP"),
      period: z.enum(["hourly", "monthly", "annually"]).optional(),
    }).optional(),
  })).optional(),

  // 9. Certifications & Licenses (repeatable)
  certifications: z.array(z.object({
    name: z.string().optional(),
    issuingOrganization: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    credentialId: z.string().optional(),
    credentialUrl: z.string().url().optional().or(z.literal("")),
    skills: z.array(z.string()).optional(),
    certificateFile: z.string().optional(),
  })).optional(),

  // 10. Awards & Achievements (repeatable)
  awards: z.array(z.object({
    title: z.string().optional(),
    issuer: z.string().optional(),
    dateReceived: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(["academic", "professional", "community", "sports", "artistic", "other"]).optional(),
    certificateFile: z.string().optional(),
  })).optional(),

  // 11. Job Target & Fit
  jobTarget: z.object({
    targetRoles: z.array(z.string()).optional(),
    targetIndustries: z.array(z.string()).optional(),
    targetCompanies: z.array(z.string()).optional(),
    careerLevel: z.enum(["entry", "junior", "mid", "senior", "lead", "manager", "director", "executive"]).optional(),
    salaryExpectations: z.object({
      minSalary: z.number().optional(),
      maxSalary: z.number().optional(),
      currency: z.string().default("EGP"),
      period: z.enum(["monthly", "annually"]).default("monthly"),
      negotiable: z.boolean().optional(),
    }).optional(),
    benefits: z.object({
      healthInsurance: z.boolean().optional(),
      retirementPlan: z.boolean().optional(),
      paidTimeOff: z.boolean().optional(),
      flexibleSchedule: z.boolean().optional(),
      remoteWork: z.boolean().optional(),
      professionalDevelopment: z.boolean().optional(),
      stockOptions: z.boolean().optional(),
      other: z.array(z.string()).optional(),
    }).optional(),
    careerGoals: z.string().optional(),
    workStyle: z.string().optional(),
    motivations: z.string().optional(),
    dealBreakers: z.string().optional(),
  }),
});

type ComprehensiveProfileData = z.infer<typeof comprehensiveProfileSchema>;

export default function ProfilePage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("personal");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form initialization with empty default values
  const form = useForm<ComprehensiveProfileData>({
    resolver: zodResolver(comprehensiveProfileSchema),
    defaultValues: {
      personalDetails: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: undefined,
        nationality: "",
        address: {
          street: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
        },
        emergencyContact: {
          name: "",
          relationship: "",
          phone: "",
        },
      },
      governmentId: {
        idType: undefined,
        idNumber: "",
        expiryDate: "",
        issuingAuthority: "",
        verified: false,
      },
      linksPortfolio: {
        linkedinUrl: "",
        githubUrl: "",
        portfolioUrl: "",
        personalWebsite: "",
        behanceUrl: "",
        dribbbleUrl: "",
        otherLinks: [],
      },
      workEligibility: {
        workAuthorization: undefined,
        visaStatus: "",
        visaExpiryDate: "",
        sponsorshipRequired: undefined,
        willingToRelocate: undefined,
        preferredLocations: [],
        workArrangement: undefined,
        availabilityDate: "",
        noticePeriod: "",
        travelWillingness: undefined,
      },
      languages: [],
      skills: {
        technicalSkills: [],
        softSkills: [],
        industryKnowledge: [],
        tools: [],
      },
      education: [],
      experience: [],
      certifications: [],
      awards: [],
      jobTarget: {
        targetRoles: [],
        targetIndustries: [],
        targetCompanies: [],
        careerLevel: undefined,
        salaryExpectations: {
          minSalary: undefined,
          maxSalary: undefined,
          currency: t("egyptianPound"),
          period: t("monthly"),
          negotiable: undefined,
        },
        benefits: {
          healthInsurance: undefined,
          retirementPlan: undefined,
          paidTimeOff: undefined,
          flexibleSchedule: undefined,
          remoteWork: undefined,
          professionalDevelopment: undefined,
          stockOptions: undefined,
          other: [],
        },
        careerGoals: "",
        workStyle: "",
        motivations: "",
        dealBreakers: "",
      },
    },
  });

  // Field arrays for repeatable sections
  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control: form.control,
    name: "languages",
  });

  const { fields: technicalSkillFields, append: appendTechnicalSkill, remove: removeTechnicalSkill } = useFieldArray({
    control: form.control,
    name: "skills.technicalSkills",
  });

  const { fields: softSkillFields, append: appendSoftSkill, remove: removeSoftSkill } = useFieldArray({
    control: form.control,
    name: "skills.softSkills",
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: "education",
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: "experience",
  });

  const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  const { fields: awardFields, append: appendAward, remove: removeAward } = useFieldArray({
    control: form.control,
    name: "awards",
  });

  // Query to fetch existing profile data
  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ["/api/comprehensive-profile"],
    retry: false,
  });

  const profileProgress = (existingProfile as any)?.completionPercentage || 0;

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: ComprehensiveProfileData) => {
      return await apiRequest("/api/comprehensive-profile/autosave", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      setLastSaved(new Date());
      setIsAutoSaving(false);
    },
    onError: (error) => {
      setIsAutoSaving(false);
      if (!isUnauthorizedError(error)) {
        console.error("Auto-save failed:", error);
      }
    },
  });

  // Main save mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ComprehensiveProfileData) => {
      return await apiRequest("/api/comprehensive-profile", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: async (data) => {
      console.log('Profile saved successfully:', data);

      // Invalidate and refetch all profile-related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/comprehensive-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Refetch the comprehensive profile to get the latest completion percentage
      const freshData = await queryClient.fetchQuery({
        queryKey: ["/api/comprehensive-profile"],
      });

      const progressPercentage = (freshData as any)?.completionPercentage || (data as any)?.completionPercentage || 0;
      toast({
        title: t("profileProgress"),
        description: t("profileComplete", { percentage: progressPercentage }),
      });
    },
    onError: (error) => {
      console.error('Profile save error:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: t("auth.unauthorized"),
          description: t("auth.loggingOut"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("errorSavingProfile"),
        description: error.message || t("pleaseCheckFieldsTryAgain"),
        variant: "destructive",
      });
    },
  });

  // Auto-save function with debouncing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalSaveRef = useRef<NodeJS.Timeout | null>(null);

  const autoSave = useCallback(
    async (data: ComprehensiveProfileData) => {
      if (!isAutoSaving) {
        setIsAutoSaving(true);
        autoSaveMutation.mutate(data);
      }
    },
    [autoSaveMutation, isAutoSaving]
  );

  // Debounced auto-save function
  const debouncedAutoSave = useCallback(
    (data: ComprehensiveProfileData) => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave(data);
      }, 10000);
    },
    [autoSave]
  );

  // Auto-save on form changes with debouncing AND regular interval saves
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data && !isLoading) {
        debouncedAutoSave(data as ComprehensiveProfileData);
      }
    });

    intervalSaveRef.current = setInterval(() => {
      const currentData = form.getValues();
      if (currentData && !isLoading && form.formState.isDirty) {
        autoSave(currentData as ComprehensiveProfileData);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (intervalSaveRef.current) {
        clearInterval(intervalSaveRef.current);
      }
    };
  }, [form, debouncedAutoSave, autoSave, isLoading]);

  // Update form with existing data when it loads
  useEffect(() => {
    if (existingProfile && !form.formState.isDirty) {
      form.reset(existingProfile);
    }
  }, [existingProfile, form]);

  const onSubmit = (data: ComprehensiveProfileData) => {
    console.log('Form submitted via onSubmit with data:', data);
    console.log('Form errors:', form.formState.errors);
    saveProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  const tabTriggers = [
    { value: "personal", label: t("personalDetails"), icon: User },
    { value: "government", label: t("governmentIdSubmission"), icon: Shield },
    { value: "links", label: t("linksPortfolio"), icon: Globe },
    { value: "eligibility", label: t("workEligibility"), icon: MapPin },
    { value: "languages", label: t("languages"), icon: Languages },
    { value: "skills", label: t("skills"), icon: Settings },
    { value: "education", label: t("education"), icon: GraduationCap },
    { value: "experience", label: t("workExperience"), icon: Briefcase },
    { value: "certifications", label: t("certifications"), icon: Award },
    { value: "awards", label: t("awards"), icon: Star },
    { value: "target", label: t("jobTarget"), icon: Target },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Build Your Profile
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Complete your profile to unlock better job matches
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Simple progress indicator */}
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">Profile Completion</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profileProgress}%</p>
            </div>
            {/* Auto-save status */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {isAutoSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>{t("saving")}</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span>
                    {t("lastSaved")}: {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Auto-save enabled</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Clean Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="relative">
                <div className="overflow-x-auto pb-2">
                  <TabsList className="inline-flex w-full min-w-max h-auto p-1 gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200/60 dark:border-slate-700/60 rounded-lg">
                    {tabTriggers.map(({ value, label, icon: Icon }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden lg:inline whitespace-nowrap">
                          {label}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

            {/* Personal Details Tab */}
            <TabsContent value="personal" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 dark:text-slate-200">
                    <User className="h-5 w-5" />
                    <span>{t("personalDetails")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="personalDetails.firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("firstName")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("enterFirstName")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalDetails.lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("lastName")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("enterLastName")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalDetails.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("email")} *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder={t("enterEmail")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalDetails.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("phone")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("enterPhone")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalDetails.dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("dateOfBirth")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalDetails.gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("gender")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                <SelectValue placeholder={t("selectGender")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                              <SelectItem value="male">{t("male")}</SelectItem>
                              <SelectItem value="female">{t("female")}</SelectItem>
                              <SelectItem value="non-binary">{t("nonBinary")}</SelectItem>
                              <SelectItem value="prefer-not-to-say">{t("preferNotToSay")}</SelectItem>
                              <SelectItem value="other">{t("other")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalDetails.nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("nationality")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("enterNationality")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Address Section */}
                  <div className="border-t pt-4 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-3 dark:text-slate-200">{t("address")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="personalDetails.address.street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("streetAddress")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterStreetAddress")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalDetails.address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("city")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterCity")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalDetails.address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("stateProvince")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterStateProvince")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalDetails.address.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("country")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterCountry")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalDetails.address.postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("postalCode")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterPostalCode")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Section */}
                  <div className="border-t pt-4 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-3 dark:text-slate-200">{t("emergencyContact")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="personalDetails.emergencyContact.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("name")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("emergencyContactName")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalDetails.emergencyContact.relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("relationship")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("relationshipToYou")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalDetails.emergencyContact.phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("phone")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("emergencyContactPhone")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Government ID Tab */}
            <TabsContent value="government" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 dark:text-slate-200">
                    <Shield className="h-5 w-5" />
                    <span>{t("governmentIdSubmission")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="governmentId.idType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("idType")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                <SelectValue placeholder={t("selectIdType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                              <SelectItem value="passport">{t("passport")}</SelectItem>
                              <SelectItem value="national-id">{t("nationalId")}</SelectItem>
                              <SelectItem value="driving-license">{t("drivingLicense")}</SelectItem>
                              <SelectItem value="other">{t("other")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="governmentId.idNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("idNumber")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("enterIdNumber")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="governmentId.expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("expiryDate")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="governmentId.issuingAuthority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("issuingAuthority")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("enterIssuingAuthority")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Links & Portfolio Tab */}
            <TabsContent value="links" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 dark:text-slate-200">
                    <Globe className="h-5 w-5" />
                    <span>{t("linksPortfolio")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="linksPortfolio.linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("linkedinUrl")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("linkedinUrlPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linksPortfolio.githubUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("githubUrl")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("githubUrlPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linksPortfolio.portfolioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("portfolioUrl")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("portfolioUrlPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linksPortfolio.personalWebsite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("personalWebsite")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("personalWebsitePlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linksPortfolio.behanceUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("behanceUrl")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("behanceUrlPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linksPortfolio.dribbbleUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("dribbbleUrl")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("dribbbleUrlPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Work Eligibility Tab */}
            <TabsContent value="eligibility" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 dark:text-slate-200">
                    <MapPin className="h-5 w-5" />
                    <span>{t("workEligibility")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workEligibility.workAuthorization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("workAuthorization")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                <SelectValue placeholder={t("selectAuthorizationStatus")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                              <SelectItem value="citizen">{t("citizen")}</SelectItem>
                              <SelectItem value="permanent-resident">{t("permanentResident")}</SelectItem>
                              <SelectItem value="work-visa">{t("workVisa")}</SelectItem>
                              <SelectItem value="student-visa">{t("studentVisa")}</SelectItem>
                              <SelectItem value="other">{t("other")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workEligibility.workArrangement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("workArrangementPreference")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                <SelectValue placeholder={t("selectPreference")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                              <SelectItem value="onsite">{t("onsite")}</SelectItem>
                              <SelectItem value="remote">{t("remote")}</SelectItem>
                              <SelectItem value="hybrid">{t("hybrid")}</SelectItem>
                              <SelectItem value="flexible">{t("flexible")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workEligibility.availabilityDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("availabilityDate")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workEligibility.noticePeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("noticePeriod")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("noticePeriodExample")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="workEligibility.willingToRelocate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 rtl:space-x-reverse space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="dark:text-slate-200">{t("willingToRelocate")}</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workEligibility.sponsorshipRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 rtl:space-x-reverse space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="dark:text-slate-200">{t("requireVisaSponsorship")}</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Languages Tab */}
            <TabsContent value="languages" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Languages className="h-5 w-5" />
                      <span>{t("languages")}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendLanguage({ language: "", proficiency: "conversational", certification: "" })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("addLanguage")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {languageFields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeLanguage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`languages.${index}.language`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("language")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("languageExample")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`languages.${index}.proficiency`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("proficiency")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t("selectProficiency")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                  <SelectItem value="basic">{t("basic")}</SelectItem>
                                  <SelectItem value="conversational">{t("conversational")}</SelectItem>
                                  <SelectItem value="fluent">{t("fluent")}</SelectItem>
                                  <SelectItem value="native">{t("native")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`languages.${index}.certification`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("certification")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("certificationExample")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 dark:text-slate-200">
                    <Settings className="h-5 w-5" />
                    <span>{t("skills")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Technical Skills */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium dark:text-slate-200">{t("technicalSkills")} *</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendTechnicalSkill({ skill: "", level: "intermediate", yearsOfExperience: 0 })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t("addSkill")}
                      </Button>
                    </div>
                    {technicalSkillFields.map((field, index) => (
                      <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative mb-4">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeTechnicalSkill(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`skills.technicalSkills.${index}.skill`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="dark:text-slate-200">{t("skill")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("technicalSkillExample")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`skills.technicalSkills.${index}.level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="dark:text-slate-200">{t("level")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                      <SelectValue placeholder={t("selectLevel")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                    <SelectItem value="beginner">{t("beginner")}</SelectItem>
                                    <SelectItem value="intermediate">{t("intermediate")}</SelectItem>
                                    <SelectItem value="advanced">{t("advanced")}</SelectItem>
                                    <SelectItem value="expert">{t("expert")}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`skills.technicalSkills.${index}.yearsOfExperience`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="dark:text-slate-200">{t("yearsOfExperience")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    placeholder={t("enterZero")}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Soft Skills */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium dark:text-slate-200">{t("softSkills")} *</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendSoftSkill({ skill: "", level: "intermediate" })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t("addSkill")}
                      </Button>
                    </div>
                    {softSkillFields.map((field, index) => (
                      <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative mb-4">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeSoftSkill(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`skills.softSkills.${index}.skill`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="dark:text-slate-200">{t("skill")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("softSkillExample")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`skills.softSkills.${index}.level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="dark:text-slate-200">{t("level")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                      <SelectValue placeholder={t("selectLevel")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                    <SelectItem value="beginner">{t("beginner")}</SelectItem>
                                    <SelectItem value="intermediate">{t("intermediate")}</SelectItem>
                                    <SelectItem value="advanced">{t("advanced")}</SelectItem>
                                    <SelectItem value="expert">{t("expert")}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <GraduationCap className="h-5 w-5" />
                      <span>{t("education")}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendEducation({
                        institution: "",
                        degree: "",
                        fieldOfStudy: "",
                        startDate: "",
                        endDate: "",
                        current: false,
                        gpa: "",
                        honors: "",
                        relevantCoursework: "",
                        thesis: "",
                        location: "",
                      })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("addEducation")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {educationFields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeEducation(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`education.${index}.institution`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("institution")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("institutionPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.degree`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("degree")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("degreePlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.fieldOfStudy`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("fieldOfStudy")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("fieldOfStudyPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.location`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("location")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("locationPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.startDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("startDate")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.endDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("endDate")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.gpa`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("gpa")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("gpaPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name={`education.${index}.current`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 rtl:space-x-reverse space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="dark:text-slate-200">{t("currentlyStudyingHere")}</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${index}.relevantCoursework`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("relevantCoursework")}</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={2} placeholder={t("listRelevantCourses")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Briefcase className="h-5 w-5" />
                      <span>{t("workExperience")}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendExperience({
                        company: "",
                        position: "",
                        department: "",
                        employmentType: undefined,
                        startDate: "",
                        endDate: "",
                        current: false,
                        location: "",
                        responsibilities: "",
                        achievements: "",
                        technologies: [],
                        teamSize: 0,
                        reportingTo: "",
                        salary: {
                          amount: 0,
                          currency: t("egyptianPound"),
                          period: t("monthly"),
                        },
                      })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("addExperience")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {experienceFields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeExperience(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`experience.${index}.company`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("company")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("companyPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${index}.position`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("position")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("positionPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${index}.employmentType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("employmentType")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t("selectType")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                  <SelectItem value="full-time">{t("fullTime")}</SelectItem>
                                  <SelectItem value="part-time">{t("partTime")}</SelectItem>
                                  <SelectItem value="contract">{t("contract")}</SelectItem>
                                  <SelectItem value="freelance">{t("freelance")}</SelectItem>
                                  <SelectItem value="internship">{t("internship")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${index}.location`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("location")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("locationPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${index}.startDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("startDate")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${index}.endDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("endDate")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name={`experience.${index}.current`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 rtl:space-x-reverse space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="dark:text-slate-200">{t("currentlyWorkingHere")}</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${index}.responsibilities`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("keyResponsibilitiesAchievements")} *</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={4} placeholder={t("describeKeyResponsibilitiesAchievements")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Certifications Tab */}
            <TabsContent value="certifications" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Award className="h-5 w-5" />
                      <span>{t("certifications")}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendCertification({
                        name: "",
                        issuingOrganization: "",
                        issueDate: "",
                        expiryDate: "",
                        credentialId: "",
                        credentialUrl: "",
                        skills: [],
                        certificateFile: "",
                      })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("addCertification")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {certificationFields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeCertification(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("certificationName")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("certificationNamePlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.issuingOrganization`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("issuingOrganization")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("issuingOrganizationPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.issueDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("issueDate")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.expiryDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("expiryDate")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.credentialId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("credentialId")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("credentialIdPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.credentialUrl`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("credentialUrl")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("credentialUrlPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4">
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                          <h5 className="font-medium mb-2 dark:text-slate-200">{t("certificateFile")}</h5>
                          <Button type="button" variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            {t("uploadCertificate")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Awards Tab */}
            <TabsContent value="awards" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Star className="h-5 w-5" />
                      <span>{t("awards")}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendAward({
                        title: "",
                        issuer: "",
                        dateReceived: "",
                        description: "",
                        category: undefined,
                        certificateFile: "",
                      })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("addAward")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {awardFields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeAward(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`awards.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("awardTitle")} *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("awardTitlePlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`awards.${index}.issuer`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("issuingOrganization")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("issuerPlaceholder")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`awards.${index}.dateReceived`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("dateReceived")}</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`awards.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("category")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t("selectCategory")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                  <SelectItem value="academic">{t("academic")}</SelectItem>
                                  <SelectItem value="professional">{t("professional")}</SelectItem>
                                  <SelectItem value="community">{t("community")}</SelectItem>
                                  <SelectItem value="sports">{t("sports")}</SelectItem>
                                  <SelectItem value="artistic">{t("artistic")}</SelectItem>
                                  <SelectItem value="other">{t("other")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name={`awards.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-200">{t("description")}</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={3} placeholder={t("describeAwardAchievement")} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                          <h5 className="font-medium mb-2 dark:text-slate-200">{t("certificateFile")}</h5>
                          <Button type="button" variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            {t("uploadCertificate")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Job Target Tab */}
            <TabsContent value="target" className="space-y-4">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 dark:text-slate-200">
                    <Target className="h-5 w-5" />
                    <span>{t("jobTarget")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="jobTarget.careerLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("careerLevel")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                <SelectValue placeholder={t("selectCareerLevel")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                              <SelectItem value="entry">{t("entryLevel")}</SelectItem>
                              <SelectItem value="junior">{t("junior")}</SelectItem>
                              <SelectItem value="mid">{t("midLevel")}</SelectItem>
                              <SelectItem value="senior">{t("senior")}</SelectItem>
                              <SelectItem value="lead">{t("lead")}</SelectItem>
                              <SelectItem value="manager">{t("manager")}</SelectItem>
                              <SelectItem value="director">{t("director")}</SelectItem>
                              <SelectItem value="executive">{t("executive")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Salary Expectations */}
                  <div className="border-t pt-4 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-3 dark:text-slate-200">{t("salaryExpectations")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="jobTarget.salaryExpectations.minSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("minimumSalary")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder={t("enterZero")}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobTarget.salaryExpectations.maxSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("maximumSalary")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder={t("enterZero")}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobTarget.salaryExpectations.currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("currency")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                  <SelectValue placeholder={t("currency")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                <SelectItem value="EGP">{t("egyptianPound")}</SelectItem>
                                <SelectItem value="USD">{t("usDollar")}</SelectItem>
                                <SelectItem value="EUR">{t("euro")}</SelectItem>
                                <SelectItem value="GBP">{t("britishPound")}</SelectItem>
                                <SelectItem value="SAR">{t("saudiRiyal")}</SelectItem>
                                <SelectItem value="AED">{t("uaeDirham")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobTarget.salaryExpectations.period"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-slate-200">{t("period")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                  <SelectValue placeholder={t("period")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                                <SelectItem value="annually">{t("annually")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="jobTarget.salaryExpectations.negotiable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 rtl:space-x-reverse space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="dark:text-slate-200">{t("salaryIsNegotiable")}</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Text fields for goals and preferences */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="jobTarget.careerGoals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("careerGoals")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={4}
                              placeholder={t("describeCareerGoalsAspirations")}
                              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTarget.workStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("workStyle")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder={t("describePreferredWorkStyle")}
                              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTarget.motivations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("whatMotivatesYou")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder={t("whatDrivesMotivatesCareer")}
                              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTarget.dealBreakers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-slate-200">{t("dealBreakers")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder={t("dealBreakersJob")}
                              className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          <div className="flex justify-between items-center pt-6 border-t dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")}>
              {t("cancel")}
            </Button>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <Button
                type="button"
                variant="secondary"
                onClick={() => autoSave(form.getValues())}
                disabled={isAutoSaving}
              >
                {isAutoSaving ? t("saving") : t("saveDraft")}
              </Button>
              <Button
                type="button"
                disabled={saveProfileMutation.isPending}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  console.log('Save Progress button clicked - saving current progress');

                  try {
                    const formData = form.getValues();
                    console.log('Saving current profile progress...');
                    saveProfileMutation.mutate(formData);
                  } catch (error) {
                    console.error('Error during save:', error);
                    toast({
                      title: t("saveError"),
                      description: t("saveErrorDescription"),
                      variant: "destructive",
                    });
                  }
                }}
              >
                {saveProfileMutation.isPending ? t("saving") : t("saveProgress")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}
