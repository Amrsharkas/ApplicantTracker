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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, User, FileText } from "lucide-react";

const profileFormSchema = z.object({
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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isUploading, setIsUploading] = useState(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">My Profile</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[75vh] overflow-y-auto space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
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
                    {profile?.completionPercentage >= 80 ? "Ready for AI Interview!" : "Fill out more to reach 80%"}
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

          {/* Profile Completion Guide */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">Profile Completion Guide</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div className="flex justify-between">
                  <span>• Basic Info (Age, Education, Location)</span>
                  <span className="font-medium">20 points</span>
                </div>
                <div className="flex justify-between">
                  <span>• Work Experience (Role, Company, Years)</span>
                  <span className="font-medium">30 points</span>
                </div>
                <div className="flex justify-between">
                  <span>• Education Details (Degree, University)</span>
                  <span className="font-medium">20 points</span>
                </div>
                <div className="flex justify-between">
                  <span>• Skills & Summary</span>
                  <span className="font-medium">15 points</span>
                </div>
                <div className="flex justify-between">
                  <span>• Resume Upload</span>
                  <span className="font-medium">15 points</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Upload */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-slate-800">Resume</h4>
                    <p className="text-sm text-slate-600">
                      {profile?.resumeUrl ? 'Resume uploaded (+15% completion)' : 'Upload your resume for AI analysis (+15% completion)'}
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
            </CardContent>
          </Card>

          {/* Profile Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="25"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="glass-card"
                        />
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
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco, CA" {...field} className="glass-card" />
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
                        <Input placeholder="Software Engineer" {...field} className="glass-card" />
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
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="TechCorp Inc." {...field} className="glass-card" />
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
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="glass-card"
                        />
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
                        <Input placeholder="Bachelor of Science" {...field} className="glass-card" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University</FormLabel>
                      <FormControl>
                        <Input placeholder="Stanford University" {...field} className="glass-card" />
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
                      <FormLabel>Field of Study</FormLabel>
                      <FormControl>
                        <Input placeholder="Computer Science" {...field} className="glass-card" />
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
                        placeholder="Experienced software engineer with expertise in React, Node.js, and cloud technologies..."
                        rows={4}
                        {...field}
                        className="glass-card resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AI Profile Display */}
              {profile?.aiProfile && (
                <Card className="glass-card bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      AI-Generated Profile Insights
                    </h4>
                    <div className="space-y-2 text-sm">
                      {profile.aiProfile.skills && (
                        <div>
                          <span className="font-medium text-slate-700">Skills: </span>
                          <span className="text-slate-600">{profile.aiProfile.skills.join(', ')}</span>
                        </div>
                      )}
                      {profile.aiProfile.personality && (
                        <div>
                          <span className="font-medium text-slate-700">Personality: </span>
                          <span className="text-slate-600">{profile.aiProfile.personality}</span>
                        </div>
                      )}
                      {profile.aiProfile.workStyle && (
                        <div>
                          <span className="font-medium text-slate-700">Work Style: </span>
                          <span className="text-slate-600">{profile.aiProfile.workStyle}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
