import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, User, FileText, MapPin, Briefcase, GraduationCap, Globe, Phone, Mail, Calendar, Users } from "lucide-react";

const profileFormSchema = z.object({
  // General Information
  fullName: z.string().optional(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  numberOfDependents: z.number().min(0).max(20).optional(),
  militaryStatus: z.string().optional(),
  
  // Location
  country: z.string().optional(),
  city: z.string().optional(),
  willingToRelocate: z.boolean().optional(),
  
  // Contact Information
  mobileNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  
  // Career Information
  careerLevel: z.string().optional(),
  jobTypesOpen: z.array(z.string()).optional(),
  preferredWorkplace: z.string().optional(),
  desiredJobTitles: z.array(z.string()).optional(),
  interestedJobCategories: z.array(z.string()).optional(),
  minimumSalary: z.number().min(0).optional(),
  hideSalaryFromCompanies: z.boolean().optional(),
  preferredWorkCountries: z.array(z.string()).optional(),
  jobSearchStatus: z.string().optional(),
  availableForImmediateHiring: z.boolean().optional(),
  
  // Experience
  yearsOfExperience: z.number().min(0).max(50).optional(),
  
  // Education
  currentEducationLevel: z.string().optional(),
  
  // Legacy fields
  age: z.number().min(16).max(100).optional(),
  education: z.string().optional(),
  university: z.string().optional(),
  degree: z.string().optional(),
  location: z.string().optional(),
  currentRole: z.string().optional(),
  company: z.string().optional(),
  summary: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Constants for dropdown options
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Netherlands", 
  "Sweden", "Switzerland", "Denmark", "Norway", "Japan", "Singapore", "UAE", "Egypt", "Saudi Arabia",
  "India", "China", "Brazil", "Mexico", "Spain", "Italy", "Other"
];

const CAREER_LEVELS = [
  { value: "student", label: "Student" },
  { value: "entry_level", label: "Entry Level" },
  { value: "experienced_non_manager", label: "Experienced (Non-Manager)" },
  { value: "manager", label: "Manager" },
  { value: "senior_management", label: "Senior Management (VP, CEO)" }
];

const JOB_TYPES = [
  { value: "fulltime", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "freelance", label: "Freelance/Project" },
  { value: "internship", label: "Internship" },
  { value: "shift_based", label: "Shift Based" },
  { value: "volunteering", label: "Volunteering" },
  { value: "student_activity", label: "Student Activity" }
];

const WORKPLACE_SETTINGS = [
  { value: "onsite", label: "Onsite" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" }
];

const JOB_SEARCH_STATUS = [
  { value: "actively_looking", label: "I am actively looking for a job" },
  { value: "open_to_opportunities", label: "I am happy but don't mind better opportunities" },
  { value: "specific_opportunities_only", label: "I am only interested in very specific opportunities" },
  { value: "not_looking", label: "I am not looking for a job" }
];

const EDUCATION_LEVELS = [
  { value: "high_school", label: "High School" },
  { value: "vocational", label: "Vocational" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "phd", label: "PhD" }
];

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isOpen,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      age: profile?.age || undefined,
      education: profile?.education || "",
      university: profile?.university || "",
      degree: profile?.degree || "",
      location: profile?.location || "",
      currentRole: profile?.currentRole || "",
      company: profile?.company || "",
      yearsOfExperience: profile?.yearsOfExperience || undefined,
      summary: profile?.summary || "",
    },
  });

  // Update form when profile data loads
  useState(() => {
    if (profile) {
      form.reset({
        age: profile.age || undefined,
        education: profile.education || "",
        university: profile.university || "",
        degree: profile.degree || "",
        location: profile.location || "",
        currentRole: profile.currentRole || "",
        company: profile.company || "",
        yearsOfExperience: profile.yearsOfExperience || undefined,
        summary: profile.summary || "",
      });
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      await apiRequest("POST", "/api/candidate/profile", data);
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
        return;
      }
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/candidate/resume', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been uploaded and processed successfully!",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
    } catch (error) {
      console.error('Resume upload error:', error);
      
      let errorMessage = "Failed to upload resume. Please try again.";
      
      if (error.name === 'AbortError') {
        errorMessage = "Upload timed out. The file may be too large or your connection is slow. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-6 h-6" />
            My Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[75vh] overflow-y-auto">
          {/* Profile Header */}
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-lg">
                {user?.firstName || 'Anonymous'} {user?.lastName || 'User'}
              </h3>
              <p className="text-slate-600">
                {profile?.currentRole || 'Job Seeker'} {profile?.company && `at ${profile.company}`}
              </p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {profile?.completionPercentage || 0}% Complete
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {profile?.completionPercentage >= 80 ? "Ready for AI Interview!" : "Complete your profile for better job matching"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${profile?.completionPercentage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Comprehensive Profile Form with Tabs */}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="career" className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                Career
              </TabsTrigger>
              <TabsTrigger value="experience" className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                Experience
              </TabsTrigger>
              <TabsTrigger value="education" className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                Education
              </TabsTrigger>
            </TabsList>

            {/* General Information Tab */}
            <TabsContent value="general" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User className="w-5 h-5" />
                        General Information
                      </h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age</FormLabel>
                              <FormControl>
                                <Input type="number" min="16" max="100" placeholder="25" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="nationality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nationality</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select nationality" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COUNTRIES.map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <FormField
                          control={form.control}
                          name="numberOfDependents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Dependents</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Saving..." : "Save General Information"}
                      </Button>
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location & Relocation
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input placeholder="Enter your city" {...field} />
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Would you be willing to relocate for the right opportunity?
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Career Tab */}
            <TabsContent value="career" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Career Preferences
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="careerLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Career Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your career level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CAREER_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select workplace preference" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WORKPLACE_SETTINGS.map((setting) => (
                                <SelectItem key={setting.value} value={setting.value}>
                                  {setting.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="jobSearchStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Job Search Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your job search status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {JOB_SEARCH_STATUS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Types of Jobs You're Open To</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {JOB_TYPES.map((jobType) => (
                        <div key={jobType.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={jobType.value}
                            checked={selectedJobTypes.includes(jobType.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedJobTypes([...selectedJobTypes, jobType.value]);
                              } else {
                                setSelectedJobTypes(selectedJobTypes.filter(type => type !== jobType.value));
                              }
                            }}
                          />
                          <label htmlFor={jobType.value} className="text-sm font-medium">
                            {jobType.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="minimumSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Salary (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="50000" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hideSalaryFromCompanies"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Hide salary expectations from companies
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Work Experience
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="yearsOfExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="50" placeholder="3" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Role</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Engineer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Tech Corp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Summary</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your professional experience, key achievements, and career goals..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Education & Resume
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentEducationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Highest Education Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select education level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EDUCATION_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="university"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>University/Institution</FormLabel>
                          <FormControl>
                            <Input placeholder="Harvard University" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="degree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Degree/Field of Study</FormLabel>
                          <FormControl>
                            <Input placeholder="Computer Science" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Education Details</FormLabel>
                          <FormControl>
                            <Input placeholder="GPA, Honors, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Resume Upload Section */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-slate-800">Resume Upload</h4>
                          <p className="text-sm text-slate-600">
                            {profile?.resumeUrl ? 'Resume uploaded successfully' : 'Upload your resume for AI analysis'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.txt"
                          onChange={handleResumeUpload}
                          className="hidden"
                          id="resume-upload"
                          disabled={isUploading}
                        />
                        <label htmlFor="resume-upload">
                          <Button
                            variant="outline"
                            disabled={isUploading}
                            className="cursor-pointer"
                            asChild
                          >
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              {isUploading ? 'Uploading...' : 'Upload'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </DialogContent>
    </Dialog>
  );
}
