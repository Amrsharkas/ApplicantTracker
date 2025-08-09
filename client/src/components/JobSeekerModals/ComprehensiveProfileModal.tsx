import { useState, useEffect, useCallback } from "react";
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
import { 
  User, MapPin, GraduationCap, Briefcase, Award, Settings, Globe, FileText,
  Upload, Plus, X, Shield, Languages, Target, Star
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

  // Reset profile mutation
  const resetProfileMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/comprehensive-profile/reset', { method: 'POST' });
    },
    onSuccess: () => {
      toast({
        title: "Profile Reset",
        description: "Your profile has been reset to start fresh.",
      });
      // Reset the form to default values
      form.reset();
      // Refetch the profile data
      queryClient.invalidateQueries({ queryKey: ["/api/comprehensive-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Reset Failed",
        description: "Failed to reset profile. Please try again.",
        variant: "destructive",
      });
    },
  });

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
          currency: "EGP",
          period: "monthly",
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
    onSuccess: (data) => {
      console.log('Profile saved successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/comprehensive-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Show success message with progress info
      const progressPercentage = data?.completionPercentage || 0;
      toast({
        title: "Profile progress saved!",
        description: `Your profile is ${progressPercentage}% complete. ${progressPercentage >= 85 ? 'Interviews are now unlocked!' : 'Continue building to unlock interviews at 85%.'}`,
      });
      onClose();
    },
    onError: (error) => {
      console.error('Profile save error:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error saving profile",
        description: error.message || "Please check all required fields and try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save function
  const autoSave = useCallback(
    async (data: ComprehensiveProfileData) => {
      if (!isAutoSaving) {
        setIsAutoSaving(true);
        autoSaveMutation.mutate(data);
      }
    },
    [autoSaveMutation, isAutoSaving]
  );

  // Auto-save on field blur and timer
  useEffect(() => {
    const subscription = form.watch((data) => {
      const timer = setTimeout(() => {
        if (data) {
          autoSave(data as ComprehensiveProfileData);
        }
      }, 3000); // Auto-save every 3 seconds

      return () => clearTimeout(timer);
    });

    return () => subscription.unsubscribe();
  }, [form, autoSave]);

  // Update form with existing data when it loads
  useEffect(() => {
    if (existingProfile) {
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
    { value: "personal", label: "Personal", icon: User },
    { value: "government", label: "ID", icon: Shield },
    { value: "links", label: "Links", icon: Globe },
    { value: "eligibility", label: "Eligibility", icon: MapPin },
    { value: "languages", label: "Languages", icon: Languages },
    { value: "skills", label: "Skills", icon: Settings },
    { value: "education", label: "Education", icon: GraduationCap },
    { value: "experience", label: "Experience", icon: Briefcase },
    { value: "certifications", label: "Certs", icon: Award },
    { value: "awards", label: "Awards", icon: Star },
    { value: "target", label: "Job Target", icon: Target },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Build Your Complete Profile</span>
            </DialogTitle>
            <div className="flex items-center space-x-4">
              {/* Temporary Reset Button for Testing */}
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={() => resetProfileMutation.mutate()}
                disabled={resetProfileMutation.isPending}
              >
                {resetProfileMutation.isPending ? "Resetting..." : "Reset Profile"}
              </Button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {isAutoSaving && (
                  <div className="flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                    <span>Saving...</span>
                  </div>
                )}
                {lastSaved && !isAutoSaving && (
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                )}
              </div>
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
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Personal Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="personalDetails.firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter first name" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter last name" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="Enter email" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Phone *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter phone number" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="non-binary">Non-binary</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
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
                            <FormLabel>Nationality</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter nationality" onBlur={() => autoSave(form.getValues())} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Address Section */}
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium mb-3">Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="personalDetails.address.street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter street address" onBlur={() => autoSave(form.getValues())} />
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
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter city" onBlur={() => autoSave(form.getValues())} />
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
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter state/province" onBlur={() => autoSave(form.getValues())} />
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
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter country" onBlur={() => autoSave(form.getValues())} />
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
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter postal code" onBlur={() => autoSave(form.getValues())} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Emergency Contact Section */}
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="personalDetails.emergencyContact.name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Emergency contact name" onBlur={() => autoSave(form.getValues())} />
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
                              <FormLabel>Relationship</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Relationship to you" onBlur={() => autoSave(form.getValues())} />
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
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Emergency contact phone" onBlur={() => autoSave(form.getValues())} />
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
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Job Target & Fit</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="jobTarget.careerLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Career Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select career level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="entry">Entry Level</SelectItem>
                                <SelectItem value="junior">Junior</SelectItem>
                                <SelectItem value="mid">Mid-Level</SelectItem>
                                <SelectItem value="senior">Senior</SelectItem>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="director">Director</SelectItem>
                                <SelectItem value="executive">Executive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Salary Expectations */}
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium mb-3">Salary Expectations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="jobTarget.salaryExpectations.minSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Salary</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  placeholder="0"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  onBlur={() => autoSave(form.getValues())}
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
                              <FormLabel>Maximum Salary</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  placeholder="0"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  onBlur={() => autoSave(form.getValues())}
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
                              <FormLabel>Currency</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="EGP">EGP</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SAR">SAR</SelectItem>
                                  <SelectItem value="AED">AED</SelectItem>
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
                              <FormLabel>Period</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Period" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="annually">Annually</SelectItem>
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
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Salary is negotiable</FormLabel>
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
                            <FormLabel>Career Goals</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={4} 
                                placeholder="Describe your career goals and aspirations..."
                                onBlur={() => autoSave(form.getValues())}
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
                            <FormLabel>Work Style</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={3} 
                                placeholder="Describe your preferred work style and environment..."
                                onBlur={() => autoSave(form.getValues())}
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
                            <FormLabel>What Motivates You</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={3} 
                                placeholder="What drives and motivates you in your career..."
                                onBlur={() => autoSave(form.getValues())}
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
                            <FormLabel>Deal Breakers</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={3} 
                                placeholder="What would be deal breakers for you in a job..."
                                onBlur={() => autoSave(form.getValues())}
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
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Government ID Submission</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="governmentId.idType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ID type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="national-id">National ID</SelectItem>
                                <SelectItem value="driving-license">Driving License</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
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
                            <FormLabel>ID Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter ID number" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Issuing Authority</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Issuing authority" onBlur={() => autoSave(form.getValues())} />
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
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Links & Portfolio</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="linksPortfolio.linkedinUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://linkedin.com/in/yourprofile" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>GitHub URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://github.com/yourusername" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Portfolio URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://yourportfolio.com" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Personal Website</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://yourwebsite.com" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Behance URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://behance.net/yourprofile" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Dribbble URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://dribbble.com/yourprofile" onBlur={() => autoSave(form.getValues())} />
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
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Work Eligibility & Preferences</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workEligibility.workAuthorization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Authorization</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select authorization status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="citizen">Citizen</SelectItem>
                                <SelectItem value="permanent-resident">Permanent Resident</SelectItem>
                                <SelectItem value="work-visa">Work Visa</SelectItem>
                                <SelectItem value="student-visa">Student Visa</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
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
                            <FormLabel>Work Arrangement Preference</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select preference" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="onsite">Onsite</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                                <SelectItem value="flexible">Flexible</SelectItem>
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
                            <FormLabel>Availability Date</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                            <FormLabel>Notice Period</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 2 weeks, 1 month" onBlur={() => autoSave(form.getValues())} />
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
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Willing to relocate for the right opportunity</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workEligibility.sponsorshipRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Require visa sponsorship</FormLabel>
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
                      <div className="flex items-center space-x-2">
                        <Languages className="h-5 w-5" />
                        <span>Languages</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendLanguage({ language: "", proficiency: "conversational", certification: "" })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Language
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
                                <FormLabel>Language *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., English, Arabic" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Proficiency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select proficiency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="conversational">Conversational</SelectItem>
                                    <SelectItem value="fluent">Fluent</SelectItem>
                                    <SelectItem value="native">Native</SelectItem>
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
                                <FormLabel>Certification</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., IELTS, TOEFL" onBlur={() => autoSave(form.getValues())} />
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
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>Skills</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Technical Skills */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-medium">Technical Skills *</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendTechnicalSkill({ skill: "", level: "intermediate", yearsOfExperience: 0 })}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Skill
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
                                  <FormLabel>Skill *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., JavaScript, Python" onBlur={() => autoSave(form.getValues())} />
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
                                  <FormLabel>Level</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select level" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="beginner">Beginner</SelectItem>
                                      <SelectItem value="intermediate">Intermediate</SelectItem>
                                      <SelectItem value="advanced">Advanced</SelectItem>
                                      <SelectItem value="expert">Expert</SelectItem>
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
                                  <FormLabel>Years of Experience</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      placeholder="0"
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                                      onBlur={() => autoSave(form.getValues())}
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
                        <h4 className="text-lg font-medium">Soft Skills *</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendSoftSkill({ skill: "", level: "intermediate" })}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Skill
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
                                  <FormLabel>Skill *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Communication, Leadership" onBlur={() => autoSave(form.getValues())} />
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
                                  <FormLabel>Level</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select level" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="beginner">Beginner</SelectItem>
                                      <SelectItem value="intermediate">Intermediate</SelectItem>
                                      <SelectItem value="advanced">Advanced</SelectItem>
                                      <SelectItem value="expert">Expert</SelectItem>
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
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-5 w-5" />
                        <span>Education</span>
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
                        Add Education
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
                                <FormLabel>Institution *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="University/College name" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Degree *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Bachelor's, Master's, etc." onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Field of Study</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Computer Science, Business, etc." onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="City, Country" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>GPA</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="3.8/4.0" onBlur={() => autoSave(form.getValues())} />
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
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Currently studying here</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`education.${index}.relevantCoursework`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Relevant Coursework</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={2} placeholder="List relevant courses..." onBlur={() => autoSave(form.getValues())} />
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
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-5 w-5" />
                        <span>Work Experience</span>
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
                            currency: "EGP",
                            period: "monthly",
                          },
                        })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Experience
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
                                <FormLabel>Company *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Company name" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Position *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Job title" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Employment Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="full-time">Full-time</SelectItem>
                                    <SelectItem value="part-time">Part-time</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="freelance">Freelance</SelectItem>
                                    <SelectItem value="internship">Internship</SelectItem>
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
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="City, Country" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Currently working here</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`experience.${index}.responsibilities`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Key Responsibilities & Achievements *</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={4} placeholder="Describe your key responsibilities, achievements, and impact..." onBlur={() => autoSave(form.getValues())} />
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
                      <div className="flex items-center space-x-2">
                        <Award className="h-5 w-5" />
                        <span>Certifications & Licenses</span>
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
                        Add Certification
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
                                <FormLabel>Certification Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="AWS Certified Developer" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Issuing Organization</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Amazon Web Services" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Issue Date</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Expiry Date</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Credential ID</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Certificate ID" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Credential URL</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Verification URL" onBlur={() => autoSave(form.getValues())} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="mt-4">
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">Certificate File</h5>
                            <Button type="button" variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Certificate
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
                      <div className="flex items-center space-x-2">
                        <Star className="h-5 w-5" />
                        <span>Awards & Achievements</span>
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
                        Add Award
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
                                <FormLabel>Award Title *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Employee of the Month" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Issuing Organization</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Company/Organization name" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Date Received</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" onBlur={() => autoSave(form.getValues())} />
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
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="academic">Academic</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="community">Community</SelectItem>
                                    <SelectItem value="sports">Sports</SelectItem>
                                    <SelectItem value="artistic">Artistic</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
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
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={3} placeholder="Describe the award and what you achieved..." onBlur={() => autoSave(form.getValues())} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">Certificate File</h5>
                            <Button type="button" variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Certificate
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
                Cancel
              </Button>
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => autoSave(form.getValues())}
                  disabled={isAutoSaving}
                >
                  {isAutoSaving ? "Saving..." : "Save Draft"}
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
                        title: "Save Error",
                        description: "There was an error saving your profile. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {saveProfileMutation.isPending ? "Saving..." : "Save Progress"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}