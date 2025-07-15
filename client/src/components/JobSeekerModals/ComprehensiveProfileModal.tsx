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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Upload, User, FileText, MapPin, Briefcase, GraduationCap, 
  Award, Globe, Trophy, Plus, X, Calendar, Phone, Mail
} from "lucide-react";

// Define comprehensive profile schema
const profileFormSchema = z.object({
  // Essential Information
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),

  // General Information
  birthdate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  nationality: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'other']).optional(),
  dependents: z.number().min(0).max(10).optional(),
  militaryStatus: z.enum(['never_served', 'served', 'currently_serving', 'reserved']).optional(),

  // Location
  country: z.string().optional(),
  city: z.string().optional(),
  willingToRelocate: z.boolean().optional(),

  // Career Interests
  careerLevel: z.enum(['student', 'entry_level', 'experienced', 'manager', 'senior_management']).optional(),
  jobTypes: z.array(z.enum(['fulltime', 'part_time', 'freelance', 'internship', 'shift_based', 'volunteering', 'student_activity'])).optional(),
  workplaceSettings: z.enum(['onsite', 'remote', 'hybrid']).optional(),
  jobTitles: z.array(z.string()).optional(),
  jobCategories: z.array(z.string()).optional(),
  minimumSalary: z.number().min(0).optional(),
  hideSalaryFromCompanies: z.boolean().optional(),
  preferredWorkCountries: z.array(z.string()).optional(),
  jobSearchStatus: z.enum(['actively_looking', 'happy_but_open', 'specific_opportunities', 'not_looking', 'immediate_hiring']).optional(),

  // Experience
  totalYearsOfExperience: z.number().min(0).max(50).optional(),
  workExperiences: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    current: z.boolean().default(false)
  })).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'native'])
  })).optional(),

  // Education
  currentEducationLevel: z.enum(['high_school', 'vocational', 'diploma', 'bachelors', 'masters', 'phd']).optional(),
  degrees: z.array(z.object({
    level: z.enum(['bachelors', 'masters', 'phd']),
    country: z.string(),
    university: z.string(),
    fieldOfStudy: z.string(),
    startYear: z.number(),
    endYear: z.number().optional(),
    gpa: z.string().optional(),
    studiedSubjects: z.string().optional(),
    additionalInfo: z.string().optional()
  })).optional(),
  highSchools: z.array(z.object({
    schoolName: z.string(),
    country: z.string(),
    certificateName: z.string(),
    languageOfStudy: z.string(),
    graduationYear: z.number(),
    grade: z.string().optional(),
    additionalInfo: z.string().optional()
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    dateAwarded: z.string(),
    organization: z.string(),
    grade: z.string().optional(),
    score: z.string().optional(),
    link: z.string().optional(),
    certificateId: z.string().optional()
  })).optional(),
  trainingCourses: z.array(z.object({
    topic: z.string(),
    organization: z.string(),
    monthYear: z.string(),
    additionalInfo: z.string().optional()
  })).optional(),

  // Online Presence
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  otherUrls: z.array(z.string()).optional(),

  // Achievements
  achievements: z.string().optional(),

  // Legacy fields
  age: z.number().min(16).max(100).optional(),
  education: z.string().optional(),
  university: z.string().optional(),
  degree: z.string().optional(),
  location: z.string().optional(),
  currentRole: z.string().optional(),
  company: z.string().optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  summary: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ComprehensiveProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComprehensiveProfileModal({ isOpen, onClose }: ComprehensiveProfileModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("essential");
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
      name: profile?.name || "",
      email: profile?.email || user?.email || "",
      phone: profile?.phone || "",
      birthdate: profile?.birthdate || "",
      gender: profile?.gender || undefined,
      nationality: profile?.nationality || "",
      maritalStatus: profile?.maritalStatus || undefined,
      dependents: profile?.dependents || undefined,
      militaryStatus: profile?.militaryStatus || undefined,
      country: profile?.country || "",
      city: profile?.city || "",
      willingToRelocate: profile?.willingToRelocate || false,
      careerLevel: profile?.careerLevel || undefined,
      jobTypes: profile?.jobTypes || [],
      workplaceSettings: profile?.workplaceSettings || undefined,
      jobTitles: profile?.jobTitles || [],
      jobCategories: profile?.jobCategories || [],
      minimumSalary: profile?.minimumSalary || undefined,
      hideSalaryFromCompanies: profile?.hideSalaryFromCompanies || false,
      preferredWorkCountries: profile?.preferredWorkCountries || [],
      jobSearchStatus: profile?.jobSearchStatus || undefined,
      totalYearsOfExperience: profile?.totalYearsOfExperience || undefined,
      workExperiences: profile?.workExperiences || [],
      languages: profile?.languages || [],
      currentEducationLevel: profile?.currentEducationLevel || undefined,
      degrees: profile?.degrees || [],
      highSchools: profile?.highSchools || [],
      certifications: profile?.certifications || [],
      trainingCourses: profile?.trainingCourses || [],
      linkedinUrl: profile?.linkedinUrl || "",
      facebookUrl: profile?.facebookUrl || "",
      twitterUrl: profile?.twitterUrl || "",
      instagramUrl: profile?.instagramUrl || "",
      githubUrl: profile?.githubUrl || "",
      youtubeUrl: profile?.youtubeUrl || "",
      websiteUrl: profile?.websiteUrl || "",
      otherUrls: profile?.otherUrls || [],
      achievements: profile?.achievements || "",
      
      // Legacy fields
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
        name: profile.name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        birthdate: profile.birthdate || "",
        gender: profile.gender || undefined,
        nationality: profile.nationality || "",
        maritalStatus: profile.maritalStatus || undefined,
        dependents: profile.dependents || undefined,
        militaryStatus: profile.militaryStatus || undefined,
        country: profile.country || "",
        city: profile.city || "",
        willingToRelocate: profile.willingToRelocate || false,
        careerLevel: profile.careerLevel || undefined,
        jobTypes: profile.jobTypes || [],
        workplaceSettings: profile.workplaceSettings || undefined,
        jobTitles: profile.jobTitles || [],
        jobCategories: profile.jobCategories || [],
        minimumSalary: profile.minimumSalary || undefined,
        hideSalaryFromCompanies: profile.hideSalaryFromCompanies || false,
        preferredWorkCountries: profile.preferredWorkCountries || [],
        jobSearchStatus: profile.jobSearchStatus || undefined,
        totalYearsOfExperience: profile.totalYearsOfExperience || undefined,
        workExperiences: profile.workExperiences || [],
        languages: profile.languages || [],
        currentEducationLevel: profile.currentEducationLevel || undefined,
        degrees: profile.degrees || [],
        highSchools: profile.highSchools || [],
        certifications: profile.certifications || [],
        trainingCourses: profile.trainingCourses || [],
        linkedinUrl: profile.linkedinUrl || "",
        facebookUrl: profile.facebookUrl || "",
        twitterUrl: profile.twitterUrl || "",
        instagramUrl: profile.instagramUrl || "",
        githubUrl: profile.githubUrl || "",
        youtubeUrl: profile.youtubeUrl || "",
        websiteUrl: profile.websiteUrl || "",
        otherUrls: profile.otherUrls || [],
        achievements: profile.achievements || "",
        
        // Legacy fields
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
  }, [profile, user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PUT", "/api/candidate/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been saved.",
      });
      onClose();
    },
    onError: (error: Error) => {
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
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Complete Your Profile</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="essential">Essential</TabsTrigger>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="career">Career</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
              </TabsList>

              <TabsContent value="essential" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Essential Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your full name" />
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
                              <Input {...field} placeholder="Enter your email" type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your phone number" />
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
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="Enter your age"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>General Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="birthdate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
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
                              <Input {...field} placeholder="Enter your nationality" />
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
                                  <SelectValue placeholder="Select marital status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dependents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Dependents</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="Enter number of dependents"
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
                        name="militaryStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Military Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select military status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="never_served">Never served</SelectItem>
                                <SelectItem value="served">Previously served</SelectItem>
                                <SelectItem value="currently_serving">Currently serving</SelectItem>
                                <SelectItem value="reserved">Reserved</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Location & Preferences</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your country" />
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
                              <Input {...field} placeholder="Enter your city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location (Legacy)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your location" />
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
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Willing to relocate for the right opportunity
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="career" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5" />
                      <span>Career Interests</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="careerLevel"
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
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="entry_level">Entry Level</SelectItem>
                                <SelectItem value="experienced">Experienced</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="senior_management">Senior Management</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workplaceSettings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workplace Preference</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select workplace preference" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="onsite">On-site</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobSearchStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Search Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select job search status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="actively_looking">Actively looking</SelectItem>
                                <SelectItem value="happy_but_open">Happy but open to opportunities</SelectItem>
                                <SelectItem value="specific_opportunities">Only specific opportunities</SelectItem>
                                <SelectItem value="not_looking">Not looking</SelectItem>
                                <SelectItem value="immediate_hiring">Available for immediate hiring</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="minimumSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Salary Expectation</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="Enter minimum salary"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="hideSalaryFromCompanies"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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

              <TabsContent value="experience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5" />
                      <span>Work Experience</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="totalYearsOfExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Years of Experience</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="Enter total years of experience"
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
                        name="currentRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Role</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your current role" />
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
                              <Input {...field} placeholder="Enter your current company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="yearsOfExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years in Current Role</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                placeholder="Years in current role"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
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
                            <Textarea {...field} rows={4} placeholder="Enter your professional summary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="education" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <GraduationCap className="h-5 w-5" />
                      <span>Education</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <SelectItem value="high_school">High School</SelectItem>
                                <SelectItem value="vocational">Vocational</SelectItem>
                                <SelectItem value="diploma">Diploma</SelectItem>
                                <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                                <SelectItem value="masters">Master's Degree</SelectItem>
                                <SelectItem value="phd">PhD</SelectItem>
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
                              <Input {...field} placeholder="Enter university or institution" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="degree"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Degree</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your degree" />
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
                            <FormLabel>Education Details</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} placeholder="Enter education details" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="online" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Online Presence</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="linkedinUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://linkedin.com/in/yourprofile" />
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
                            <FormLabel>GitHub URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://github.com/yourusername" />
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
                            <FormLabel>Personal Website</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://yourwebsite.com" />
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
                            <FormLabel>YouTube Channel</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://youtube.com/yourchannel" />
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
                            <FormLabel>Twitter URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://twitter.com/yourusername" />
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
                            <FormLabel>Facebook URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://facebook.com/yourprofile" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="achievements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <Trophy className="h-4 w-4" />
                            <span>Achievements</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} placeholder="Describe your achievements, awards, certifications, and notable accomplishments..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}