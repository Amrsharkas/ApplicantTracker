import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

const buildManualCVSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t("manualCvForm.validation.nameMin")),
  birthdate: z.date().optional(),
  nationality: z.string().optional(),
  phone: z.string().min(10, t("manualCvForm.validation.phone")),
  email: z.string().email(t("manualCvForm.validation.email")),
  country: z.string().optional(),
  city: z.string().optional(),
  degrees: z.array(z.object({
    institution: z.string().min(1, t("manualCvForm.validation.institution")),
    degree: z.string().min(1, t("manualCvForm.validation.degree")),
    field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
  })).min(1, t("manualCvForm.validation.educationRequired")),
  workExperiences: z.array(z.object({
    company: z.string().min(1, t("manualCvForm.validation.company")),
    position: z.string().min(1, t("manualCvForm.validation.position")),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    responsibilities: z.string().min(10, t("manualCvForm.validation.responsibilities")),
    current: z.boolean().optional(),
  })).min(1, t("manualCvForm.validation.experienceRequired")),
  languages: z.array(z.object({
    language: z.string().min(1, t("manualCvForm.validation.languageName")),
    proficiency: z.enum(["basic", "intermediate", "advanced", "native"]),
  })).min(1, t("manualCvForm.validation.languagesRequired")),
  certifications: z.array(z.object({
    name: z.string().min(1, t("manualCvForm.validation.certificationName")),
    issuer: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
  })),
  technicalSkills: z.array(z.string()).min(1, t("manualCvForm.validation.technicalSkills")),
  softSkills: z.array(z.string()).min(1, t("manualCvForm.validation.softSkills")),
  jobTypes: z.array(z.enum(["fulltime", "part_time", "freelance", "internship"])).min(1, t("manualCvForm.validation.jobTypes")),
  workplaceSettings: z.enum(["onsite", "remote", "hybrid"]).optional(),
  preferredWorkCountries: z.array(z.string()),
  achievements: z.string().optional(),
  summary: z.string().min(50, t("manualCvForm.validation.summary")),
});

type ManualCVSchema = ReturnType<typeof buildManualCVSchema>;
type ManualCVFormData = z.infer<ManualCVSchema>;

interface ManualCVFormProps {
  onComplete: () => void;
  initialData?: Partial<ManualCVFormData>;
}

export function ManualCVForm({ onComplete, initialData }: ManualCVFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentTechSkill, setCurrentTechSkill] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();
  const schema = useMemo(() => buildManualCVSchema(t), [t]);
  const jobTypeLabels: Record<string, string> = {
    fulltime: t("manualCvForm.jobTypes.fulltime"),
    "part_time": t("manualCvForm.jobTypes.part_time"),
    freelance: t("manualCvForm.jobTypes.freelance"),
    internship: t("manualCvForm.jobTypes.internship"),
  };
  const workplaceLabels: Record<string, string> = {
    onsite: t("manualCvForm.workplaceOptions.onsite"),
    remote: t("manualCvForm.workplaceOptions.remote"),
    hybrid: t("manualCvForm.workplaceOptions.hybrid"),
  };

  const form = useForm<ManualCVFormData>({
    resolver: zodResolver(schema),
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
        title: t("manualCvForm.toasts.successTitle"),
        description: t("manualCvForm.toasts.successDescription"),
      });

      onComplete();
    } catch (error) {
      console.error("Error saving CV information:", error);
      toast({
        title: t("manualCvForm.toasts.errorTitle"),
        description: t("manualCvForm.toasts.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("manualCvForm.title")}</h1>
        <p className="text-gray-600">{t("manualCvForm.subtitle")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("manualCvForm.sections.personal.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t("manualCvForm.sections.personal.fields.name.label")}</Label>
                <Input
                  {...form.register("name")}
                  placeholder={t("manualCvForm.sections.personal.fields.name.placeholder")}
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">{t("manualCvForm.sections.personal.fields.email.label")}</Label>
                <Input
                  {...form.register("email")}
                  type="email"
                  placeholder={t("manualCvForm.sections.personal.fields.email.placeholder")}
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">{t("manualCvForm.sections.personal.fields.phone.label")}</Label>
                <Input
                  {...form.register("phone")}
                  placeholder={t("manualCvForm.sections.personal.fields.phone.placeholder")}
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="nationality">{t("manualCvForm.sections.personal.fields.nationality.label")}</Label>
                <Input
                  {...form.register("nationality")}
                  placeholder={t("manualCvForm.sections.personal.fields.nationality.placeholder")}
                />
              </div>
              <div>
                <Label htmlFor="country">{t("manualCvForm.sections.personal.fields.country.label")}</Label>
                <Input
                  {...form.register("country")}
                  placeholder={t("manualCvForm.sections.personal.fields.country.placeholder")}
                />
              </div>
              <div>
                <Label htmlFor="city">{t("manualCvForm.sections.personal.fields.city.label")}</Label>
                <Input
                  {...form.register("city")}
                  placeholder={t("manualCvForm.sections.personal.fields.city.placeholder")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t("manualCvForm.sections.education.title")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendDegree({ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("manualCvForm.sections.education.addButton")}
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
                    <Label>{t("manualCvForm.sections.education.fields.institution.label")}</Label>
                    <Input
                      {...form.register(`degrees.${index}.institution`)}
                      placeholder={t("manualCvForm.sections.education.fields.institution.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.education.fields.degree.label")}</Label>
                    <Input
                      {...form.register(`degrees.${index}.degree`)}
                      placeholder={t("manualCvForm.sections.education.fields.degree.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.education.fields.field.label")}</Label>
                    <Input
                      {...form.register(`degrees.${index}.field`)}
                      placeholder={t("manualCvForm.sections.education.fields.field.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.education.fields.gpa.label")}</Label>
                    <Input
                      {...form.register(`degrees.${index}.gpa`)}
                      placeholder={t("manualCvForm.sections.education.fields.gpa.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.education.fields.startDate.label")}</Label>
                    <Input
                      {...form.register(`degrees.${index}.startDate`)}
                      placeholder={t("manualCvForm.sections.education.fields.startDate.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.education.fields.endDate.label")}</Label>
                    <Input
                      {...form.register(`degrees.${index}.endDate`)}
                      placeholder={t("manualCvForm.sections.education.fields.endDate.placeholder")}
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
              {t("manualCvForm.sections.experience.title")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendExperience({ company: "", position: "", startDate: "", endDate: "", responsibilities: "", current: false })}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("manualCvForm.sections.experience.addButton")}
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
                    <Label>{t("manualCvForm.sections.experience.fields.company.label")}</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.company`)}
                      placeholder={t("manualCvForm.sections.experience.fields.company.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.experience.fields.position.label")}</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.position`)}
                      placeholder={t("manualCvForm.sections.experience.fields.position.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.experience.fields.startDate.label")}</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.startDate`)}
                      placeholder={t("manualCvForm.sections.experience.fields.startDate.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.experience.fields.endDate.label")}</Label>
                    <Input
                      {...form.register(`workExperiences.${index}.endDate`)}
                      placeholder={t("manualCvForm.sections.experience.fields.endDate.placeholder")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>{t("manualCvForm.sections.experience.fields.responsibilities.label")}</Label>
                    <Textarea
                      {...form.register(`workExperiences.${index}.responsibilities`)}
                      rows={4}
                      placeholder={t("manualCvForm.sections.experience.fields.responsibilities.placeholder")}
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
              {t("manualCvForm.sections.languages.title")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendLanguage({ language: "", proficiency: "intermediate" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("manualCvForm.sections.languages.addButton")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {languageFields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-4">
                <div className="flex-1">
                  <Label>{t("manualCvForm.sections.languages.languageLabel")}</Label>
                  <Input
                    {...form.register(`languages.${index}.language`)}
                    placeholder={t("manualCvForm.sections.languages.languagePlaceholder")}
                  />
                </div>
                <div className="flex-1">
                  <Label>{t("manualCvForm.sections.languages.proficiencyLabel")}</Label>
                  <Select
                    value={form.watch(`languages.${index}.proficiency`)}
                    onValueChange={(value) => form.setValue(`languages.${index}.proficiency`, value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("manualCvForm.sections.languages.proficiencyPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">{t("manualCvForm.sections.languages.proficiencyOptions.basic")}</SelectItem>
                      <SelectItem value="intermediate">{t("manualCvForm.sections.languages.proficiencyOptions.intermediate")}</SelectItem>
                      <SelectItem value="advanced">{t("manualCvForm.sections.languages.proficiencyOptions.advanced")}</SelectItem>
                      <SelectItem value="native">{t("manualCvForm.sections.languages.proficiencyOptions.native")}</SelectItem>
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
            <CardTitle>{t("manualCvForm.sections.skills.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Technical Skills */}
            <div>
              <Label className="text-base font-medium">{t("manualCvForm.sections.skills.technicalLabel")}</Label>
              <div className="flex gap-2 mt-2 mb-3">
                <Input
                  value={currentTechSkill}
                  onChange={(e) => setCurrentTechSkill(e.target.value)}
                  placeholder={t("manualCvForm.sections.skills.technicalPlaceholder")}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTechnicalSkill())}
                />
                <Button type="button" onClick={addTechnicalSkill}>{t("manualCvForm.sections.skills.addButton")}</Button>
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
              <Label className="text-base font-medium">{t("manualCvForm.sections.skills.softLabel")}</Label>
              <div className="flex gap-2 mt-2 mb-3">
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  placeholder={t("manualCvForm.sections.skills.softPlaceholder")}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSoftSkill())}
                />
                <Button type="button" onClick={addSoftSkill}>{t("manualCvForm.sections.skills.addButton")}</Button>
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
              {t("manualCvForm.sections.certifications.title")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCertification({ name: "", issuer: "", issueDate: "", expiryDate: "" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("manualCvForm.sections.certifications.addButton")}
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
                    <Label>{t("manualCvForm.sections.certifications.fields.name.label")}</Label>
                    <Input
                      {...form.register(`certifications.${index}.name`)}
                      placeholder={t("manualCvForm.sections.certifications.fields.name.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.certifications.fields.issuer.label")}</Label>
                    <Input
                      {...form.register(`certifications.${index}.issuer`)}
                      placeholder={t("manualCvForm.sections.certifications.fields.issuer.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.certifications.fields.issueDate.label")}</Label>
                    <Input
                      {...form.register(`certifications.${index}.issueDate`)}
                      placeholder={t("manualCvForm.sections.certifications.fields.issueDate.placeholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("manualCvForm.sections.certifications.fields.expiryDate.label")}</Label>
                    <Input
                      {...form.register(`certifications.${index}.expiryDate`)}
                      placeholder={t("manualCvForm.sections.certifications.fields.expiryDate.placeholder")}
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
            <CardTitle>{t("manualCvForm.sections.preferences.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("manualCvForm.sections.preferences.workTypeLabel")}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {["fulltime", "part_time", "freelance", "internship"].map((type) => (
                  <label key={type} className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                    <input
                      type="checkbox"
                      value={type}
                      {...form.register("jobTypes")}
                    />
                    <span>{jobTypeLabels[type]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>{t("manualCvForm.sections.preferences.workplaceLabel")}</Label>
              <Select
                value={form.watch("workplaceSettings")}
                onValueChange={(value) => form.setValue("workplaceSettings", value as any)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("manualCvForm.sections.preferences.workplacePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(["onsite", "remote", "hybrid"] as const).map((option) => (
                    <SelectItem key={option} value={option}>{workplaceLabels[option]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Career Summary & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>{t("manualCvForm.sections.summary.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("manualCvForm.sections.summary.summaryLabel")}</Label>
              <Textarea
                {...form.register("summary")}
                rows={4}
                placeholder={t("manualCvForm.sections.summary.summaryPlaceholder")}
              />
              {form.formState.errors.summary && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.summary.message}</p>
              )}
            </div>

            <div>
              <Label>{t("manualCvForm.sections.summary.achievementsLabel")}</Label>
              <Textarea
                {...form.register("achievements")}
                rows={3}
                placeholder={t("manualCvForm.sections.summary.achievementsPlaceholder")}
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
            {isSubmitting ? t("manualCvForm.buttons.saving") : t("manualCvForm.buttons.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}