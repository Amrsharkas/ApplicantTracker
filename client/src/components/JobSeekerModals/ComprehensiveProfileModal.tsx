import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  User, MapPin, GraduationCap, Briefcase, Award, Settings, Globe, FileText,
  Upload, Plus, X, Shield, Languages, Target, Star, CheckCircle2, AlertCircle
} from "lucide-react";

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
    language: z.string().optional(), // Allow empty for incremental saving
    proficiency: z.enum(["basic", "conversational", "fluent", "native"]),
    certification: z.string().optional(),
  })).optional(), // Allow empty for incremental saving

  // 6. Skills
  skills: z.object({
    technicalSkills: z.array(z.object({
      skill: z.string().optional(), // Allow empty for incremental saving
      level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
      yearsOfExperience: z.number().min(0).optional(),
    })).optional(), // Allow empty for incremental saving
    softSkills: z.array(z.object({
      skill: z.string().optional(), // Allow empty for incremental saving
      level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    })).optional(), // Allow empty for incremental saving
    industryKnowledge: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
  }),

  // 7. Education (repeatable)
  education: z.array(z.object({
    institution: z.string().optional(), // Allow empty for incremental saving
    degree: z.string().optional(), // Allow empty for incremental saving
    fieldOfStudy: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    gpa: z.string().optional(),
    honors: z.string().optional(),
    relevantCoursework: z.string().optional(),
    thesis: z.string().optional(),
    location: z.string().optional(),
  })).optional(), // Allow empty for incremental saving

  // 8. Experience (repeatable)
  experience: z.array(z.object({
    company: z.string().optional(), // Allow empty for incremental saving
    position: z.string().optional(), // Allow empty for incremental saving
    department: z.string().optional(),
    employmentType: z.enum(["full-time", "part-time", "contract", "freelance", "internship"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    location: z.string().optional(),
    responsibilities: z.string().optional(), // Allow empty for incremental saving
    achievements: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    teamSize: z.number().optional(),
    reportingTo: z.string().optional(),
    salary: z.object({
      amount: z.number().optional(),
      currency: z.string().default("EGP"),
      period: z.enum(["hourly", "monthly", "annually"]).optional(),
    }).optional(),
  })).optional(), // Allow empty for incremental saving

  // 9. Certifications & Licenses (repeatable)
  certifications: z.array(z.object({
    name: z.string().optional(), // Allow empty for incremental saving
    issuingOrganization: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    credentialId: z.string().optional(),
    credentialUrl: z.string().url().optional().or(z.literal("")),
    skills: z.array(z.string()).optional(),
    certificateFile: z.string().optional(), // File path after upload
  })).optional(),

  // 10. Awards & Achievements (repeatable)
  awards: z.array(z.object({
    title: z.string().optional(), // Allow empty for incremental saving
    issuer: z.string().optional(),
    dateReceived: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(["academic", "professional", "community", "sports", "artistic", "other"]).optional(),
    certificateFile: z.string().optional(), // File path after upload
  })).optional(),

  // 11. Job Target & Fit
  jobTarget: z.object({
    targetRoles: z.array(z.string()).optional(), // Allow empty for incremental saving
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

interface ComprehensiveProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}


export function ComprehensiveProfileModal({ isOpen, onClose }: ComprehensiveProfileModalProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();


  // Form initialization with truly empty default values to avoid false completion scores
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
        sponsorshipRequired: undefined, // Changed from false to undefined to avoid false completion
        willingToRelocate: undefined, // Changed from false to undefined to avoid false completion
        preferredLocations: [],
        workArrangement: undefined,
        availabilityDate: "",
        noticePeriod: "",
        travelWillingness: undefined,
      },
      languages: [], // Changed from pre-filled array to truly empty
      skills: {
        technicalSkills: [], // Changed from pre-filled array to truly empty
        softSkills: [], // Changed from pre-filled array to truly empty
        industryKnowledge: [],
        tools: [],
      },
      education: [], // Changed from pre-filled array to truly empty
      experience: [], // Changed from pre-filled array to truly empty
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
          negotiable: undefined, // Changed from true to undefined to avoid false completion
        },
        benefits: {
          healthInsurance: undefined, // Changed from false to undefined to avoid false completion
          retirementPlan: undefined, // Changed from false to undefined to avoid false completion
          paidTimeOff: undefined, // Changed from false to undefined to avoid false completion
          flexibleSchedule: undefined, // Changed from false to undefined to avoid false completion
          remoteWork: undefined, // Changed from false to undefined to avoid false completion
          professionalDevelopment: undefined, // Changed from false to undefined to avoid false completion
          stockOptions: undefined, // Changed from false to undefined to avoid false completion
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
      
      // Invalidate and refetch all profile-related queries to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/comprehensive-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Refetch the comprehensive profile to get the latest completion percentage
      const freshData = await queryClient.fetchQuery({
        queryKey: ["/api/comprehensive-profile"],
      });
      
      // Use the fresh backend completion percentage for consistency
      const progressPercentage = (freshData as any)?.completionPercentage || (data as any)?.completionPercentage || 0;
      toast({
        title: t("profileProgress"),
        description: t("profileComplete", { percentage: progressPercentage }),
      });
      onClose();
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
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for 10 seconds
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave(data);
      }, 10000); // Wait 10 seconds before auto-saving
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

    // Set up interval-based autosave every 10 seconds to ensure all fields are saved
    intervalSaveRef.current = setInterval(() => {
      const currentData = form.getValues();
      if (currentData && !isLoading && form.formState.isDirty) {
        autoSave(currentData as ComprehensiveProfileData);
      }
    }, 10000); // Save every 10 seconds

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

  // Update form with existing data when it loads (only if form is currently empty)
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2 rtl:space-x-reverse">
              <User className="h-5 w-5" />
              <span>{t("buildProfile")}</span>
            </DialogTitle>
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500">
              {isAutoSaving && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                  <span>{t("saving")}</span>
                </div>
              )}
              {lastSaved && !isAutoSaving && (
                <span>{t("lastSaved")}: {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11 gap-1 h-auto p-1">
                {tabTriggers.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger 
                    key={value} 
                    value={value}
                    className="flex flex-col items-center space-y-1 py-2 px-2 text-xs"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Personal Details Tab */}
              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
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
                            <FormLabel>{t("firstName")} *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterFirstName")} />
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
                            <FormLabel>{t("lastName")} *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterLastName")} />
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
                            <FormLabel>{t("email")} *</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder={t("enterEmail")} />
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
                            <FormLabel>{t("phone")} *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterPhone")} />
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
                            <FormLabel>{t("dateOfBirth")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
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
                            <FormLabel>{t("gender")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("selectGender")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                            <FormLabel>{t("nationality")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterNationality")} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Address Section */}
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium mb-3">{t("address")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="personalDetails.address.street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("streetAddress")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("enterStreetAddress")} />
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
                              <FormLabel>{t("city")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("enterCity")} />
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
                              <FormLabel>{t("stateProvince")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("enterStateProvince")} />
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
                              <FormLabel>{t("country")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("enterCountry")} />
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
                              <FormLabel>{t("postalCode")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("enterPostalCode")} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Emergency Contact Section */}
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium mb-3">{t("emergencyContact")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="personalDetails.emergencyContact.name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("name")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("emergencyContactName")} />
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
                              <FormLabel>{t("relationship")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("relationshipToYou")} />
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
                              <FormLabel>{t("phone")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("emergencyContactPhone")} />
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

              {/* Job Target Tab */}
              <TabsContent value="target" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
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
                            <FormLabel>{t("careerLevel")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("selectCareerLevel")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium mb-3">{t("salaryExpectations")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="jobTarget.salaryExpectations.minSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("minimumSalary")}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder={t("enterZero")}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                 
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
                              <FormLabel>{t("maximumSalary")}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder={t("enterZero")}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                 
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
                              <FormLabel>{t("currency")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("currency")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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
                              <FormLabel>{t("period")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("period")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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
                                <FormLabel>{t("salaryIsNegotiable")}</FormLabel>
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
                            <FormLabel>{t("careerGoals")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={4}
                                placeholder={t("describeCareerGoalsAspirations")}
                              
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
                            <FormLabel>{t("workStyle")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                placeholder={t("describePreferredWorkStyle")}
                              
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
                            <FormLabel>{t("whatMotivatesYou")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                placeholder={t("whatDrivesMotivatesCareer")}
                              
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
                            <FormLabel>{t("dealBreakers")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                placeholder={t("dealBreakersJob")}
                              
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

              {/* Government ID Tab */}
              <TabsContent value="government" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
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
                            <FormLabel>{t("idType")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("selectIdType")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                            <FormLabel>{t("idNumber")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterIdNumber")} />
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
                            <FormLabel>{t("expiryDate")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
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
                            <FormLabel>{t("issuingAuthority")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("enterIssuingAuthority")} />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
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
                            <FormLabel>{t("linkedinUrl")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("linkedinUrlPlaceholder")} />
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
                            <FormLabel>{t("githubUrl")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("githubUrlPlaceholder")} />
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
                            <FormLabel>{t("portfolioUrl")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("portfolioUrlPlaceholder")} />
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
                            <FormLabel>{t("personalWebsite")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("personalWebsitePlaceholder")} />
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
                            <FormLabel>{t("behanceUrl")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("behanceUrlPlaceholder")} />
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
                            <FormLabel>{t("dribbbleUrl")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("dribbbleUrlPlaceholder")} />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
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
                            <FormLabel>{t("workAuthorization")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("selectAuthorizationStatus")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                            <FormLabel>{t("workArrangementPreference")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("selectPreference")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                            <FormLabel>{t("availabilityDate")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
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
                            <FormLabel>{t("noticePeriod")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("noticePeriodExample")} />
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
                              <FormLabel>{t("willingToRelocate")}</FormLabel>
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
                              <FormLabel>{t("requireVisaSponsorship")}</FormLabel>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
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
                      <div key={field.id} className="p-4 border rounded-lg relative">
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
                                <FormLabel>{t("language")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("languageExample")} />
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
                                <FormLabel>{t("proficiency")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("selectProficiency")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
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
                                <FormLabel>{t("certification")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("certificationExample")} />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Settings className="h-5 w-5" />
                      <span>{t("skills")}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Technical Skills */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-medium">{t("technicalSkills")} *</h4>
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
                        <div key={field.id} className="p-4 border rounded-lg relative mb-4">
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
                                  <FormLabel>{t("skill")} *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder={t("technicalSkillExample")} />
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
                                  <FormLabel>{t("level")}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("selectLevel")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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
                                  <FormLabel>{t("yearsOfExperience")}</FormLabel>
                                  <FormControl>
                                    <Input
                                       {...field}
                                       type="number"
                                       placeholder={t("enterZero")}
                                       value={field.value || ""}
                                       onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                                       
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
                        <h4 className="text-lg font-medium">{t("softSkills")} *</h4>
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
                        <div key={field.id} className="p-4 border rounded-lg relative mb-4">
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
                                  <FormLabel>{t("skill")} *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder={t("softSkillExample")} />
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
                                  <FormLabel>{t("level")}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("selectLevel")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
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
                      <div key={field.id} className="p-4 border rounded-lg relative">
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
                                <FormLabel>{t("institution")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("institutionPlaceholder")} />
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
                                <FormLabel>{t("degree")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("degreePlaceholder")} />
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
                                <FormLabel>{t("fieldOfStudy")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("fieldOfStudyPlaceholder")} />
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
                                <FormLabel>{t("location")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("locationPlaceholder")} />
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
                                <FormLabel>{t("startDate")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                <FormLabel>{t("endDate")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                <FormLabel>{t("gpa")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("gpaPlaceholder")} />
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
                                  <FormLabel>{t("currentlyStudyingHere")}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`education.${index}.relevantCoursework`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("relevantCoursework")}</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={2} placeholder={t("listRelevantCourses")} />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
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
                      <div key={field.id} className="p-4 border rounded-lg relative">
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
                                <FormLabel>{t("company")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("companyPlaceholder")} />
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
                                <FormLabel>{t("position")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("positionPlaceholder")} />
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
                                <FormLabel>{t("employmentType")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("selectType")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
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
                                <FormLabel>{t("location")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("locationPlaceholder")} />
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
                                <FormLabel>{t("startDate")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                <FormLabel>{t("endDate")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                  <FormLabel>{t("currentlyWorkingHere")}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`experience.${index}.responsibilities`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("keyResponsibilitiesAchievements")} *</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={4} placeholder={t("describeKeyResponsibilitiesAchievements")} />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
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
                      <div key={field.id} className="p-4 border rounded-lg relative">
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
                                <FormLabel>{t("certificationName")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("certificationNamePlaceholder")} />
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
                                <FormLabel>{t("issuingOrganization")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("issuingOrganizationPlaceholder")} />
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
                                <FormLabel>{t("issueDate")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                <FormLabel>{t("expiryDate")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                <FormLabel>{t("credentialId")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("credentialIdPlaceholder")} />
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
                                <FormLabel>{t("credentialUrl")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("credentialUrlPlaceholder")} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="mt-4">
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">{t("certificateFile")}</h5>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
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
                      <div key={field.id} className="p-4 border rounded-lg relative">
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
                                <FormLabel>{t("awardTitle")} *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("awardTitlePlaceholder")} />
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
                                <FormLabel>{t("issuingOrganization")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("issuerPlaceholder")} />
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
                                <FormLabel>{t("dateReceived")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
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
                                <FormLabel>{t("category")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("selectCategory")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
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
                                <FormLabel>{t("description")}</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={3} placeholder={t("describeAwardAchievement")} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">{t("certificateFile")}</h5>
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

            </Tabs>

            <div className="flex justify-between items-center pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
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
      </DialogContent>
    </Dialog>
  );
}