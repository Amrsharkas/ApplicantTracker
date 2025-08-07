import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const manualCVSchema = z.object({
  // Personal Information
  name: z.string().min(2, "Full name must be at least 2 characters"),
  birthdate: z.date().optional(),
  nationality: z.string().optional(),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  country: z.string().optional(),
  city: z.string().optional(),
  
  // Education
  degrees: z.array(z.object({
    institution: z.string().min(1, "Institution is required"),
    degree: z.string().min(1, "Degree is required"),
    field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
  })).min(1, "At least one education entry is required"),
  
  // Work Experience
  workExperiences: z.array(z.object({
    company: z.string().min(1, "Company name is required"),
    position: z.string().min(1, "Position is required"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    responsibilities: z.string().min(10, "Please provide detailed responsibilities"),
    current: z.boolean().optional(),
  })).min(1, "At least one work experience is required"),
  
  // Languages
  languages: z.array(z.object({
    language: z.string().min(1, "Language is required"),
    proficiency: z.enum(["basic", "intermediate", "advanced", "native"]),
  })).min(1, "At least one language is required"),
  
  // Certifications
  certifications: z.array(z.object({
    name: z.string().min(1, "Certification name is required"),
    issuer: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
  })),
  
  // Skills
  technicalSkills: z.array(z.string()).min(1, "Please add at least one technical skill"),
  softSkills: z.array(z.string()).min(1, "Please add at least one soft skill"),
  
  // Career Preferences
  jobTypes: z.array(z.enum(["fulltime", "part_time", "freelance", "internship"])).min(1, "Select at least one job type"),
  workplaceSettings: z.enum(["onsite", "remote", "hybrid"]).optional(),
  preferredWorkCountries: z.array(z.string()),
  
  // Achievements
  achievements: z.string().optional(),
  
  // Career Summary
  summary: z.string().min(50, "Please provide a detailed career summary (minimum 50 characters)"),
});

type ManualCVFormData = z.infer<typeof manualCVSchema>;

interface ManualCVFormProps {
  onComplete: () => void;
  initialData?: Partial<ManualCVFormData>;
}

export function ManualCVForm({ onComplete, initialData }: ManualCVFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentTechSkill, setCurrentTechSkill] = useState("");
  const { toast } = useToast();

  const form = useForm<ManualCVFormData>({
    resolver: zodResolver(manualCVSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      country: initialData?.country || "",
      city: initialData?.city || "",
      nationality: initialData?.nationality || "",
      degrees: initialData?.degrees || [{ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" }],
      workExperiences: initialData?.workExperiences || [{ company: "", position: "", startDate: "", endDate: "", responsibilities: "", current: false }],
      languages: initialData?.languages || [{ language: "", proficiency: "intermediate" }],
      certifications: initialData?.certifications || [],
      technicalSkills: initialData?.technicalSkills || [],
      softSkills: initialData?.softSkills || [],
      jobTypes: initialData?.jobTypes || [],
      workplaceSettings: initialData?.workplaceSettings || undefined,
      preferredWorkCountries: initialData?.preferredWorkCountries || [],
      achievements: initialData?.achievements || "",
      summary: initialData?.summary || "",
    },
  });

  const { fields: degreeFields, append: appendDegree, remove: removeDegree } = useFieldArray({
    control: form.control,
    name: "degrees",
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: "workExperiences",
  });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control: form.control,
    name: "languages",
  });

  const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  const addTechnicalSkill = () => {
    if (currentTechSkill.trim()) {
      const currentSkills = form.getValues("technicalSkills");
      form.setValue("technicalSkills", [...currentSkills, currentTechSkill.trim()]);
      setCurrentTechSkill("");
    }
  };

  const removeTechnicalSkill = (index: number) => {
    const currentSkills = form.getValues("technicalSkills");
    form.setValue("technicalSkills", currentSkills.filter((_, i) => i !== index));
  };

  const addSoftSkill = () => {
    if (currentSkill.trim()) {
      const currentSkills = form.getValues("softSkills");
      form.setValue("softSkills", [...currentSkills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSoftSkill = (index: number) => {
    const currentSkills = form.getValues("softSkills");
    form.setValue("softSkills", currentSkills.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ManualCVFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest("/api/candidate/manual-cv", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      toast({
        title: "CV Information Saved",
        description: "Your CV information has been saved successfully. You can now proceed with interviews.",
      });

      onComplete();
    } catch (error) {
      console.error("Error saving CV information:", error);
      toast({
        title: "Error",
        description: "Failed to save CV information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your CV Information</h1>
        <p className="text-gray-600">Enter your professional information manually to create your comprehensive profile</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  {...form.register("name")}
                  placeholder="Enter your full name"
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  {...form.register("email")}
                  type="email"
                  placeholder="your.email@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  {...form.register("phone")}
                  placeholder="+1 (555) 123-4567"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  {...form.register("nationality")}
                  placeholder="Your nationality"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  {...form.register("country")}
                  placeholder="Country of residence"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  {...form.register("city")}
                  placeholder="City of residence"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Education *
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendDegree({ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Education
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {degreeFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg relative">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeDegree(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Institution *</Label>
                    <Input
                      {...form.register(`degrees.${index}.institution`)}
                      placeholder="University/College name"
                    />
                  </div>
                  <div>
                    <Label>Degree *</Label>
                    <Input
                      {...form.register(`degrees.${index}.degree`)}
                      placeholder="Bachelor's, Master's, etc."
                    />
                  </div>
                  <div>
                    <Label>Field of Study</Label>
                    <Input
                      {...form.register(`degrees.${index}.field`)}
                      placeholder="Computer Science, Business, etc."
                    />
                  </div>
                  <div>
                    <Label>GPA (Optional)</Label>
                    <Input
                      {...form.register(`degrees.${index}.gpa`)}
                      placeholder="3.8/4.0"
                    />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      {...form.register(`degrees.${index}.startDate`)}
                      placeholder="2018"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      {...form.register(`degrees.${index}.endDate`)}
                      placeholder="2022"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Work Experience *
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendExperience({ company: "", position: "", startDate: "", endDate: "", responsibilities: "", current: false })}
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
                  <div>
                    <Label>Company *</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.company`)}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label>Position *</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.position`)}
                      placeholder="Job title"
                    />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.startDate`)}
                      placeholder="Jan 2020"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.endDate`)}
                      placeholder="Dec 2022 or 'Present'"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Key Responsibilities & Achievements *</Label>
                    <Textarea
                      {...form.register(`workExperiences.${index}.responsibilities`)}
                      rows={4}
                      placeholder="Describe your key responsibilities, achievements, and impact in this role..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Languages *
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendLanguage({ language: "", proficiency: "intermediate" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Language
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {languageFields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-4">
                <div className="flex-1">
                  <Label>Language</Label>
                  <Input
                    {...form.register(`languages.${index}.language`)}
                    placeholder="English, Spanish, etc."
                  />
                </div>
                <div className="flex-1">
                  <Label>Proficiency</Label>
                  <Select
                    value={form.watch(`languages.${index}.proficiency`)}
                    onValueChange={(value) => form.setValue(`languages.${index}.proficiency`, value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLanguage(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Technical Skills */}
            <div>
              <Label className="text-base font-medium">Technical Skills *</Label>
              <div className="flex gap-2 mt-2 mb-3">
                <Input
                  value={currentTechSkill}
                  onChange={(e) => setCurrentTechSkill(e.target.value)}
                  placeholder="Add a technical skill"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTechnicalSkill())}
                />
                <Button type="button" onClick={addTechnicalSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.watch("technicalSkills").map((skill, index) => (
                  <div key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {skill}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTechnicalSkill(index)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Soft Skills */}
            <div>
              <Label className="text-base font-medium">Soft Skills *</Label>
              <div className="flex gap-2 mt-2 mb-3">
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  placeholder="Add a soft skill"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSoftSkill())}
                />
                <Button type="button" onClick={addSoftSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.watch("softSkills").map((skill, index) => (
                  <div key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {skill}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeSoftSkill(index)} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Certifications
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCertification({ name: "", issuer: "", issueDate: "", expiryDate: "" })}
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
                  <div>
                    <Label>Certification Name *</Label>
                    <Input
                      {...form.register(`certifications.${index}.name`)}
                      placeholder="AWS Certified Developer"
                    />
                  </div>
                  <div>
                    <Label>Issuing Organization</Label>
                    <Input
                      {...form.register(`certifications.${index}.issuer`)}
                      placeholder="Amazon Web Services"
                    />
                  </div>
                  <div>
                    <Label>Issue Date</Label>
                    <Input
                      {...form.register(`certifications.${index}.issueDate`)}
                      placeholder="Jan 2023"
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      {...form.register(`certifications.${index}.expiryDate`)}
                      placeholder="Jan 2026"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Career Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Career Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Preferred Work Type *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {["fulltime", "part_time", "freelance", "internship"].map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={type}
                      {...form.register("jobTypes")}
                    />
                    <span className="capitalize">{type.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Workplace Setting</Label>
              <Select
                value={form.watch("workplaceSettings")}
                onValueChange={(value) => form.setValue("workplaceSettings", value as any)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select workplace preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Career Summary & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Summary & Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Professional Summary *</Label>
              <Textarea
                {...form.register("summary")}
                rows={4}
                placeholder="Provide a comprehensive summary of your professional background, key strengths, and career objectives..."
              />
              {form.formState.errors.summary && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.summary.message}</p>
              )}
            </div>

            <div>
              <Label>Key Achievements</Label>
              <Textarea
                {...form.register("achievements")}
                rows={3}
                placeholder="Highlight your most significant professional achievements, awards, recognitions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2"
          >
            {isSubmitting ? "Saving..." : "Save CV Information"}
          </Button>
        </div>
      </form>
    </div>
  );
}