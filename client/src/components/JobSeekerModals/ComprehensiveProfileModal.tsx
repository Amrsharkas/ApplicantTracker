import { useState, useEffect } from "react";
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
  Upload, User, FileText, MapPin, Briefcase, GraduationCap, BookOpen,
  Award, Globe, Trophy, Plus, X, Calendar, Phone, Mail
} from "lucide-react";

// Define comprehensive profile schema (non-duplicate fields only)
const profileFormSchema = z.object({
  // Essential Information (age only - other contact info in CV form)
  age: z.number().min(16).max(100).optional(),

  // General Information (personal, non-professional details)
  birthdate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'other']).optional(),
  dependents: z.number().min(0).max(10).optional(),
  militaryStatus: z.enum(['never_served', 'served', 'currently_serving', 'reserved']).optional(),

  // Location (general preferences only - specific location in CV form)
  willingToRelocate: z.boolean().optional(),

  // Career Interests (high-level preferences only - detailed career info in CV form)
  jobTitles: z.array(z.string()).optional(),
  jobCategories: z.array(z.string()).optional(),
  minimumSalary: z.number().min(0).optional(),
  hideSalaryFromCompanies: z.boolean().optional(),
  jobSearchStatus: z.enum(['actively_looking', 'happy_but_open', 'specific_opportunities', 'not_looking', 'immediate_hiring']).optional(),

  // Experience (high-level summary only - detailed experience in CV form)
  totalYearsOfExperience: z.number().min(0).max(50).optional(),

  // Education (high school only - higher education in CV form)
  currentEducationLevel: z.enum(['high_school', 'vocational', 'diploma', 'bachelors', 'masters', 'phd']).optional(),
  highSchools: z.array(z.object({
    schoolName: z.string(),
    country: z.string(),
    certificateName: z.string(),
    languageOfStudy: z.string(),
    graduationYear: z.number(),
    grade: z.string().optional(),
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

  // Achievements (personal achievements - professional achievements in CV form)
  personalAchievements: z.string().optional(),

  // Legacy fields (for backward compatibility)
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
      age: profile?.age || undefined,
      birthdate: profile?.birthdate || "",
      gender: profile?.gender || undefined,
      maritalStatus: profile?.maritalStatus || undefined,
      dependents: profile?.dependents || undefined,
      militaryStatus: profile?.militaryStatus || undefined,
      willingToRelocate: profile?.willingToRelocate || false,
      jobTitles: profile?.jobTitles || [],
      jobCategories: profile?.jobCategories || [],
      minimumSalary: profile?.minimumSalary || undefined,
      hideSalaryFromCompanies: profile?.hideSalaryFromCompanies || false,
      jobSearchStatus: profile?.jobSearchStatus || undefined,
      totalYearsOfExperience: profile?.totalYearsOfExperience || undefined,
      currentEducationLevel: profile?.currentEducationLevel || undefined,
      highSchools: profile?.highSchools || [],
      linkedinUrl: profile?.linkedinUrl || "",
      facebookUrl: profile?.facebookUrl || "",
      twitterUrl: profile?.twitterUrl || "",
      instagramUrl: profile?.instagramUrl || "",
      githubUrl: profile?.githubUrl || "",
      youtubeUrl: profile?.youtubeUrl || "",
      websiteUrl: profile?.websiteUrl || "",
      otherUrls: profile?.otherUrls || [],
      personalAchievements: profile?.personalAchievements || "",
      
      // Legacy fields
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
  useEffect(() => {
    if (profile) {
      form.reset({
        age: profile.age || undefined,
        birthdate: profile.birthdate || "",
        gender: profile.gender || undefined,
        maritalStatus: profile.maritalStatus || undefined,
        dependents: profile.dependents || undefined,
        militaryStatus: profile.militaryStatus || undefined,
        willingToRelocate: profile.willingToRelocate || false,
        jobTitles: profile.jobTitles || [],
        jobCategories: profile.jobCategories || [],
        minimumSalary: profile.minimumSalary || undefined,
        hideSalaryFromCompanies: profile.hideSalaryFromCompanies || false,
        jobSearchStatus: profile.jobSearchStatus || undefined,
        totalYearsOfExperience: profile.totalYearsOfExperience || undefined,
        currentEducationLevel: profile.currentEducationLevel || undefined,
        highSchools: profile.highSchools || [],
        linkedinUrl: profile.linkedinUrl || "",
        facebookUrl: profile.facebookUrl || "",
        twitterUrl: profile.twitterUrl || "",
        instagramUrl: profile.instagramUrl || "",
        githubUrl: profile.githubUrl || "",
        youtubeUrl: profile.youtubeUrl || "",
        websiteUrl: profile.websiteUrl || "",
        otherUrls: profile.otherUrls || [],
        personalAchievements: profile.personalAchievements || "",
        
        // Legacy fields
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="essential">Essential</TabsTrigger>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
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

              <TabsContent value="experience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5" />
                      <span>Experience Summary</span>
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
                            <FormLabel>Current Role (Legacy)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your current role" />
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
                          <FormLabel>Professional Summary (Legacy)</FormLabel>
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
                      <BookOpen className="h-5 w-5" />
                      <span>Education (Legacy)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="university"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>University</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your university" />
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