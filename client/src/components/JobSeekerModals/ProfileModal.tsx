import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Upload, 
  User, 
  FileText, 
  Plus, 
  Edit, 
  Trash2,
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Target
} from "lucide-react";

// Extended profile schema with all new fields
const profileFormSchema = z.object({
  // General Information
  name: z.string().optional(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  dependents: z.number().min(0).optional(),
  militaryStatus: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  willingToRelocate: z.boolean().optional(),
  mobileNumber: z.string().optional(),
  emailAddress: z.string().email().optional().or(z.literal("")),
  
  // Career Interests
  careerLevel: z.string().optional(),
  jobTypesOpen: z.array(z.string()).optional(),
  preferredWorkplace: z.string().optional(),
  desiredJobTitles: z.array(z.string()).optional(),
  jobCategories: z.array(z.string()).optional(),
  minimumSalary: z.number().min(0).optional(),
  hideSalaryFromEmployers: z.boolean().optional(),
  preferredWorkCountries: z.array(z.string()).optional(),
  jobSearchStatus: z.string().optional(),
  
  // Experience
  totalYearsExperience: z.number().min(0).optional(),
  
  // Online Presence
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  otherUrl: z.string().url().optional().or(z.literal("")),
  
  // Achievements
  achievements: z.string().optional(),
  
  // Education Level
  currentEducationLevel: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

// Interface for work experience
interface WorkExperience {
  id: string;
  experienceType: string;
  jobTitle: string;
  jobCategory: string;
  company: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
}

// Interface for skills
interface Skill {
  id: string;
  name: string;
  yearsExperience: number;
  proficiency: number; // 1-5 stars
  interestLevel: number; // 1-5 stars
  justification: string;
}

// Interface for languages
interface Language {
  id: string;
  name: string;
  reading: number; // 1-5 stars
  writing: number;
  listening: number;
  speaking: number;
  justification: string;
}

// Interface for university degrees
interface UniversityDegree {
  id: string;
  degreeLevel: string;
  country: string;
  university: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade: string;
  studiedSubjects: string;
  additionalInfo: string;
}

// Interface for high school
interface HighSchool {
  id: string;
  schoolName: string;
  country: string;
  certificateName: string;
  languageOfStudy: string;
  graduationYear: string;
  grade: string;
  additionalInfo: string;
}

// Interface for certifications
interface Certification {
  id: string;
  name: string;
  dateAwarded: string;
  issuingOrganization: string;
  gradeOrScore: string;
}

// Interface for training courses
interface TrainingCourse {
  id: string;
  topic: string;
  organization: string;
  monthYear: string;
  additionalInfo: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [universityDegrees, setUniversityDegrees] = useState<UniversityDegree[]>([]);
  const [highSchools, setHighSchools] = useState<HighSchool[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [trainingCourses, setTrainingCourses] = useState<TrainingCourse[]>([]);
  
  // Modal states
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [showHighSchoolModal, setShowHighSchoolModal] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  
  // Reset form initialization when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormInitialized(false);
    }
  }, [isOpen]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isOpen,
    retry: false,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      // General Information
      name: "",
      birthdate: "",
      gender: "",
      nationality: "",
      maritalStatus: "",
      dependents: 0,
      militaryStatus: "",
      country: "",
      city: "",
      willingToRelocate: false,
      mobileNumber: "",
      emailAddress: "",
      
      // Career Interests
      careerLevel: "",
      jobTypesOpen: [],
      preferredWorkplace: "",
      desiredJobTitles: [],
      jobCategories: [],
      minimumSalary: 0,
      hideSalaryFromEmployers: false,
      preferredWorkCountries: [],
      jobSearchStatus: "",
      
      // Experience
      totalYearsExperience: 0,
      
      // Online Presence
      linkedinUrl: "",
      facebookUrl: "",
      twitterUrl: "",
      instagramUrl: "",
      githubUrl: "",
      youtubeUrl: "",
      websiteUrl: "",
      otherUrl: "",
      
      // Achievements
      achievements: "",
      
      // Education
      currentEducationLevel: "",
    },
  });

  // Track if form has been initialized to prevent overwriting user input
  const [formInitialized, setFormInitialized] = React.useState(false);

  // Update form when profile data loads (only once)
  React.useEffect(() => {
    if (profile && !formInitialized) {
      console.log("Initializing form with profile data:", {
        name: profile.name,
        emailAddress: profile.emailAddress,
        careerLevel: profile.careerLevel,
        desiredJobTitles: profile.desiredJobTitles,
        jobCategories: profile.jobCategories,
      });
      
      // Use setValue instead of reset to avoid resetting form state
      const profileData = {
        name: profile.name || "",
        birthdate: profile.birthdate || "",
        gender: profile.gender || "",
        nationality: profile.nationality || "",
        maritalStatus: profile.maritalStatus || "",
        dependents: profile.dependents || 0,
        militaryStatus: profile.militaryStatus || "",
        country: profile.country || "",
        city: profile.city || "",
        willingToRelocate: profile.willingToRelocate || false,
        mobileNumber: profile.mobileNumber || "",
        emailAddress: profile.emailAddress || "",
        careerLevel: profile.careerLevel || "",
        jobTypesOpen: profile.jobTypesOpen || [],
        preferredWorkplace: profile.preferredWorkplace || "",
        desiredJobTitles: profile.desiredJobTitles || [],
        jobCategories: profile.jobCategories || [],
        minimumSalary: profile.minimumSalary || 0,
        hideSalaryFromEmployers: profile.hideSalaryFromEmployers || false,
        preferredWorkCountries: profile.preferredWorkCountries || [],
        jobSearchStatus: profile.jobSearchStatus || "",
        totalYearsExperience: profile.totalYearsExperience || 0,
        linkedinUrl: profile.linkedinUrl || "",
        facebookUrl: profile.facebookUrl || "",
        twitterUrl: profile.twitterUrl || "",
        instagramUrl: profile.instagramUrl || "",
        githubUrl: profile.githubUrl || "",
        youtubeUrl: profile.youtubeUrl || "",
        websiteUrl: profile.websiteUrl || "",
        otherUrl: profile.otherUrl || "",
        achievements: profile.achievements || "",
        currentEducationLevel: profile.currentEducationLevel || "",
      };
      
      // Set each field individually to preserve form state
      Object.entries(profileData).forEach(([key, value]) => {
        form.setValue(key as keyof ProfileFormData, value, { shouldDirty: false });
      });
      
      // Load complex data structures
      setWorkExperiences(profile.workExperiences || []);
      setSkills(profile.skills || []);
      setLanguages(profile.languages || []);
      setUniversityDegrees(profile.universityDegrees || []);
      setHighSchools(profile.highSchools || []);
      setCertifications(profile.certifications || []);
      setTrainingCourses(profile.trainingCourses || []);
      
      setFormInitialized(true);
    }
  }, [profile, formInitialized, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const profileData = {
        ...data,
        workExperiences,
        skills,
        languages,
        universityDegrees,
        highSchools,
        certifications,
        trainingCourses,
      };
      await apiRequest("POST", "/api/candidate/profile", profileData);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-matches"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Silent auto-save mutation (no toast notifications)
  const autoSaveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const profileData = {
        ...data,
        workExperiences,
        skills,
        languages,
        universityDegrees,
        highSchools,
        certifications,
        trainingCourses,
      };
      await apiRequest("POST", "/api/candidate/profile", profileData);
    },
    onSuccess: () => {
      // Silent success - DO NOT refresh profile data during auto-save to prevent form reset
      // Only refresh job matches which doesn't interfere with form state
      queryClient.invalidateQueries({ queryKey: ["/api/job-matches"] });
      console.log("Auto-save completed successfully");
    },
    onError: (error) => {
      // Only show error if it's unauthorized (user needs to login)
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
      console.error("Auto-save failed:", error);
      // Silently ignore other errors for auto-save
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Auto-save functionality - save every 10 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const currentData = form.getValues();
      
      // Log all form values for debugging
      console.log("FULL FORM DEBUG:", {
        allFormData: currentData,
        formIsValid: form.formState.isValid,
        formIsDirty: form.formState.isDirty,
        formErrors: form.formState.errors,
        watchedValues: form.watch(),
      });
      
      // Only auto-save if there's meaningful data (not just empty form)
      if (currentData.name || currentData.emailAddress || currentData.careerLevel || 
          (currentData.desiredJobTitles && currentData.desiredJobTitles.length > 0) ||
          (currentData.jobCategories && currentData.jobCategories.length > 0) ||
          workExperiences.length > 0 || skills.length > 0 || languages.length > 0 ||
          universityDegrees.length > 0) {
        
        console.log("Auto-saving profile data...");
        console.log("Current form data:", {
          name: currentData.name,
          emailAddress: currentData.emailAddress,
          careerLevel: currentData.careerLevel,
          desiredJobTitles: currentData.desiredJobTitles,
          jobCategories: currentData.jobCategories,
          workExperiences: workExperiences.length,
          skills: skills.length,
          languages: languages.length,
          universityDegrees: universityDegrees.length,
        });
        autoSaveProfileMutation.mutate(currentData);
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(autoSaveInterval);
  }, [form, workExperiences, skills, languages, universityDegrees, highSchools, certifications, trainingCourses, autoSaveProfileMutation]);

  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      
      const response = await fetch("/api/candidate/resume", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload resume");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been uploaded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".docx")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadResumeMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to render star rating
  const renderStarRating = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    );
  };

  const sections = [
    { id: "general", label: "General Information", icon: User },
    { id: "career", label: "Career Interests", icon: Target },
    { id: "cv", label: "Upload CV", icon: FileText },
    { id: "experience", label: "Work Experience", icon: Briefcase },
    { id: "skills", label: "Skills", icon: Star },
    { id: "languages", label: "Languages", icon: Globe },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "certifications", label: "Certifications", icon: Award },
    { id: "training", label: "Training", icon: Calendar },
    { id: "online", label: "Online Presence", icon: Globe },
    { id: "achievements", label: "Achievements", icon: Award },
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex">
        <div className="w-64 border-r bg-gray-50 p-4">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Build My Profile
            </DialogTitle>
          </DialogHeader>
          
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* General Information Section */}
              {activeSection === "general" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      General Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="birthdate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Birthdate</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="gender"
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
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationality</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Egyptian" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maritalStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marital Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dependents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Dependents</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="20"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="militaryStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Military Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="exempted">Exempted</SelectItem>
                                <SelectItem value="postponed">Postponed</SelectItem>
                                <SelectItem value="not-applicable">Not Applicable</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <h4 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Egypt" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Cairo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="willingToRelocate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Willing to Relocate?</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Are you open to relocating for job opportunities?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <h4 className="font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Information
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+20 123 456 7890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emailAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="email@example.com" 
                                {...field}
                                onChange={(e) => {
                                  console.log("Email field changed:", e.target.value);
                                  field.onChange(e);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Career Interests Section */}
              {activeSection === "career" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Career Interests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="careerLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Career Level</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              console.log("Career level changed:", value);
                              field.onChange(value);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select career level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="entry-level">Entry Level</SelectItem>
                              <SelectItem value="experienced">Experienced (Non-Manager)</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="senior-management">Senior Management (VP, CEO)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="preferredWorkplace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Workplace Setting</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="onsite" id="onsite" />
                                <Label htmlFor="onsite">Onsite</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="remote" id="remote" />
                                <Label htmlFor="remote">Remote</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="hybrid" id="hybrid" />
                                <Label htmlFor="hybrid">Hybrid</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minimumSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Acceptable Salary</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="e.g., 50000"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hideSalaryFromEmployers"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Hide from Employers</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Don't show salary expectations to employers
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="jobSearchStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Search Status</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="actively-looking" id="actively-looking" />
                                <Label htmlFor="actively-looking">Actively looking</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="open-to-opportunities" id="open-to-opportunities" />
                                <Label htmlFor="open-to-opportunities">Open to better opportunities</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="specific-roles" id="specific-roles" />
                                <Label htmlFor="specific-roles">Interested in specific roles only</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not-looking" id="not-looking" />
                                <Label htmlFor="not-looking">Not currently looking</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="immediate-hiring" id="immediate-hiring" />
                                <Label htmlFor="immediate-hiring">Available for immediate hiring</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* CV Upload Section */}
              {activeSection === "cv" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Upload CV
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Upload your CV</p>
                      <p className="text-sm text-gray-600 mb-4">
                        Supported formats: PDF, DOCX (Max 10MB)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="resume-upload"
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("resume-upload")?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Choose File"}
                      </Button>
                      {profile?.resumeUrl && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-700">
                            ✓ Resume uploaded successfully
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Work Experience Section */}
              {activeSection === "experience" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="totalYearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Years of Experience</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select years" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">0 years</SelectItem>
                              <SelectItem value="1">1 year</SelectItem>
                              <SelectItem value="2">2 years</SelectItem>
                              <SelectItem value="3">3 years</SelectItem>
                              <SelectItem value="4">4 years</SelectItem>
                              <SelectItem value="5">5 years</SelectItem>
                              <SelectItem value="6">6-10 years</SelectItem>
                              <SelectItem value="10">10+ years</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Work Experience Entries</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowWorkModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Experience
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {workExperiences.map((exp, index) => (
                        <div key={exp.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold">{exp.jobTitle}</h5>
                              <p className="text-sm text-gray-600">{exp.company}</p>
                              <p className="text-sm text-gray-500">
                                {exp.startDate} - {exp.currentlyWorking ? "Present" : exp.endDate}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWorkExperiences(workExperiences.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm mt-2 text-gray-700">{exp.description}</p>
                        </div>
                      ))}
                      
                      {workExperiences.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Briefcase className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No work experience added yet</p>
                          <p className="text-sm">Click "Add Experience" to get started</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skills Section */}
              {activeSection === "skills" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Your Skills</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSkillModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Skill
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {skills.map((skill, index) => (
                        <div key={skill.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold">{skill.name}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSkills(skills.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Experience: {skill.yearsExperience} years</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Proficiency:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= skill.proficiency ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Interest:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= skill.interestLevel ? "fill-blue-400 text-blue-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {skill.justification && (
                              <p className="text-sm text-gray-600 mt-2">{skill.justification}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {skills.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No skills added yet</p>
                          <p className="text-sm">Click "Add Skill" to showcase your abilities</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Online Presence Section */}
              {activeSection === "online" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Online Presence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="linkedinUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn</FormLabel>
                            <FormControl>
                              <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="githubUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GitHub</FormLabel>
                            <FormControl>
                              <Input placeholder="https://github.com/yourusername" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="websiteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://yourwebsite.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="twitterUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Twitter</FormLabel>
                            <FormControl>
                              <Input placeholder="https://twitter.com/yourusername" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="facebookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input placeholder="https://facebook.com/yourprofile" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagramUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="https://instagram.com/yourusername" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="youtubeUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>YouTube</FormLabel>
                            <FormControl>
                              <Input placeholder="https://youtube.com/yourchannel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="otherUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other</FormLabel>
                            <FormControl>
                              <Input placeholder="https://other-platform.com/yourprofile" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Achievements Section */}
              {activeSection === "achievements" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="achievements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key Achievements</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your key achievements, awards, recognitions, and significant accomplishments..."
                              className="min-h-[200px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Education Section */}
              {activeSection === "education" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="currentEducationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Education Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select education level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high-school">High School</SelectItem>
                              <SelectItem value="diploma">Diploma</SelectItem>
                              <SelectItem value="vocational">Vocational</SelectItem>
                              <SelectItem value="bachelor">Bachelor's</SelectItem>
                              <SelectItem value="master">Master's</SelectItem>
                              <SelectItem value="phd">PhD</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">University Degrees</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUniversityModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Degree
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {universityDegrees.map((degree, index) => (
                        <div key={degree.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold">{degree.degreeLevel} in {degree.fieldOfStudy}</h5>
                              <p className="text-sm text-gray-600">{degree.university}, {degree.country}</p>
                              <p className="text-sm text-gray-500">{degree.startYear} - {degree.endYear}</p>
                              {degree.grade && <p className="text-sm text-gray-500">Grade: {degree.grade}</p>}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUniversityDegrees(universityDegrees.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {universityDegrees.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <GraduationCap className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No university degrees added yet</p>
                          <p className="text-sm">Click "Add Degree" to include your education</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages Section */}
              {activeSection === "languages" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Language Proficiency</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLanguageModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Language
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {languages.map((language, index) => (
                        <div key={language.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold">{language.name}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLanguages(languages.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span>Reading:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= language.reading ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Writing:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= language.writing ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Listening:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= language.listening ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Speaking:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= language.speaking ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {language.justification && (
                              <p className="text-gray-600 mt-2">{language.justification}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {languages.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <Globe className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No languages added yet</p>
                          <p className="text-sm">Click "Add Language" to showcase your language skills</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Certifications Section */}
              {activeSection === "certifications" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Professional Certifications</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCertificationModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {certifications.map((cert, index) => (
                        <div key={cert.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold">{cert.name}</h5>
                              <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                              <p className="text-sm text-gray-500">Awarded: {cert.dateAwarded}</p>
                              {cert.gradeOrScore && <p className="text-sm text-gray-500">Score: {cert.gradeOrScore}</p>}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCertifications(certifications.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {certifications.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Award className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No certifications added yet</p>
                          <p className="text-sm">Click "Add Certification" to showcase your credentials</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Training Section */}
              {activeSection === "training" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Training & Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Training Courses</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTrainingModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Training
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {trainingCourses.map((training, index) => (
                        <div key={training.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold">{training.topic}</h5>
                              <p className="text-sm text-gray-600">{training.organization}</p>
                              <p className="text-sm text-gray-500">Completed: {training.monthYear}</p>
                              {training.additionalInfo && (
                                <p className="text-sm text-gray-700 mt-2">{training.additionalInfo}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTrainingCourses(trainingCourses.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {trainingCourses.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No training courses added yet</p>
                          <p className="text-sm">Click "Add Training" to showcase your professional development</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Sub-Modals for Adding Individual Entries */}
        
        {/* Work Experience Modal */}
        <AddWorkExperienceModal
          isOpen={showWorkModal}
          onClose={() => setShowWorkModal(false)}
          onAdd={(experience) => {
            setWorkExperiences([...workExperiences, { ...experience, id: Date.now().toString() }]);
            setShowWorkModal(false);
          }}
        />

        {/* Skills Modal */}
        <AddSkillModal
          isOpen={showSkillModal}
          onClose={() => setShowSkillModal(false)}
          onAdd={(skill) => {
            setSkills([...skills, { ...skill, id: Date.now().toString() }]);
            setShowSkillModal(false);
          }}
        />

        {/* Languages Modal */}
        <AddLanguageModal
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          onAdd={(language) => {
            setLanguages([...languages, { ...language, id: Date.now().toString() }]);
            setShowLanguageModal(false);
          }}
        />

        {/* University Degree Modal */}
        <AddUniversityDegreeModal
          isOpen={showUniversityModal}
          onClose={() => setShowUniversityModal(false)}
          onAdd={(degree) => {
            setUniversityDegrees([...universityDegrees, { ...degree, id: Date.now().toString() }]);
            setShowUniversityModal(false);
          }}
        />

        {/* Certification Modal */}
        <AddCertificationModal
          isOpen={showCertificationModal}
          onClose={() => setShowCertificationModal(false)}
          onAdd={(certification) => {
            setCertifications([...certifications, { ...certification, id: Date.now().toString() }]);
            setShowCertificationModal(false);
          }}
        />

        {/* Training Modal */}
        <AddTrainingModal
          isOpen={showTrainingModal}
          onClose={() => setShowTrainingModal(false)}
          onAdd={(training) => {
            setTrainingCourses([...trainingCourses, { ...training, id: Date.now().toString() }]);
            setShowTrainingModal(false);
          }}
        />
        
      </DialogContent>
    </Dialog>
  );
}

// Sub-Modal Components

// Add Work Experience Modal
function AddWorkExperienceModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (experience: Omit<WorkExperience, 'id'>) => void;
}) {
  const form = useForm({
    defaultValues: {
      experienceType: "",
      jobTitle: "",
      jobCategory: "",
      company: "",
      startDate: "",
      endDate: "",
      currentlyWorking: false,
      description: "",
    }
  });

  const handleSubmit = (data: any) => {
    onAdd(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Work Experience</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="experienceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Category *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engineering, Marketing" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Software Engineer" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="month" 
                        {...field} 
                        disabled={form.watch('currentlyWorking')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="currentlyWorking"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your responsibilities and achievements..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Experience</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Add Skill Modal
function AddSkillModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (skill: Omit<Skill, 'id'>) => void;
}) {
  const [proficiency, setProficiency] = useState(1);
  const [interestLevel, setInterestLevel] = useState(1);

  const form = useForm({
    defaultValues: {
      name: "",
      yearsExperience: 0,
      justification: "",
    }
  });

  const handleSubmit = (data: any) => {
    onAdd({
      ...data,
      proficiency,
      interestLevel,
    });
    form.reset();
    setProficiency(1);
    setInterestLevel(1);
  };

  const renderStarRating = (rating: number, onRatingChange: (rating: number) => void, label: string) => (
    <div className="space-y-2">
      <FormLabel>{label} *</FormLabel>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 cursor-pointer ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., JavaScript, Project Management" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="yearsExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="50"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {renderStarRating(proficiency, setProficiency, "Proficiency Level")}
            {renderStarRating(interestLevel, setInterestLevel, "Interest Level")}

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explain your experience with this skill..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Skill</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Add Language Modal
function AddLanguageModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (language: Omit<Language, 'id'>) => void;
}) {
  const [reading, setReading] = useState(1);
  const [writing, setWriting] = useState(1);
  const [listening, setListening] = useState(1);
  const [speaking, setSpeaking] = useState(1);

  const form = useForm({
    defaultValues: {
      name: "",
      justification: "",
    }
  });

  const handleSubmit = (data: any) => {
    onAdd({
      ...data,
      reading,
      writing,
      listening,
      speaking,
    });
    form.reset();
    setReading(1);
    setWriting(1);
    setListening(1);
    setSpeaking(1);
  };

  const renderStarRating = (rating: number, onRatingChange: (rating: number) => void, label: string) => (
    <div className="space-y-2">
      <FormLabel>{label} *</FormLabel>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Language</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., English, Arabic, French" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {renderStarRating(reading, setReading, "Reading")}
              {renderStarRating(writing, setWriting, "Writing")}
              {renderStarRating(listening, setListening, "Listening")}
              {renderStarRating(speaking, setSpeaking, "Speaking")}
            </div>

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your experience with this language..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Language</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Add University Degree Modal
function AddUniversityDegreeModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (degree: Omit<UniversityDegree, 'id'>) => void;
}) {
  const form = useForm({
    defaultValues: {
      degreeLevel: "",
      country: "",
      university: "",
      fieldOfStudy: "",
      startYear: "",
      endYear: "",
      grade: "",
      studiedSubjects: "",
      additionalInfo: "",
    }
  });

  const handleSubmit = (data: any) => {
    onAdd(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add University Degree</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="degreeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Degree Level *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select degree" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bachelor">Bachelor's</SelectItem>
                        <SelectItem value="master">Master's</SelectItem>
                        <SelectItem value="phd">PhD</SelectItem>
                        <SelectItem value="diploma">Diploma</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Egypt" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="university"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>University *</FormLabel>
                  <FormControl>
                    <Input placeholder="University name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldOfStudy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field of Study *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Computer Science" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Year *</FormLabel>
                    <FormControl>
                      <Input placeholder="2018" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Year *</FormLabel>
                    <FormControl>
                      <Input placeholder="2022" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3.8 GPA" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="studiedSubjects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Studied Subjects (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List key subjects studied..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional details about your degree..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Degree</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Add Certification Modal
function AddCertificationModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (certification: Omit<Certification, 'id'>) => void;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      dateAwarded: "",
      issuingOrganization: "",
      gradeOrScore: "",
    }
  });

  const handleSubmit = (data: any) => {
    onAdd(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Certification</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certification Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AWS Solutions Architect" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issuingOrganization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuing Organization *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amazon Web Services" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateAwarded"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Awarded *</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gradeOrScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade/Score (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 95%, Pass" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Certification</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Add Training Modal
function AddTrainingModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (training: Omit<TrainingCourse, 'id'>) => void;
}) {
  const form = useForm({
    defaultValues: {
      topic: "",
      organization: "",
      monthYear: "",
      additionalInfo: "",
    }
  });

  const handleSubmit = (data: any) => {
    onAdd(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Training Course</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Topic *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Leadership Skills" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Coursera, Udemy" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Date *</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional details about this training..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Training</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}