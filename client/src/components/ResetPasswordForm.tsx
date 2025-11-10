import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, X, Shield, Key, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
}

const passwordRequirements = [
  { regex: /.{8,}/, key: "auth.passwordRules.minLength" },
  { regex: /[A-Z]/, key: "auth.passwordRules.uppercase" },
  { regex: /[a-z]/, key: "auth.passwordRules.lowercase" },
  { regex: /[0-9]/, key: "auth.passwordRules.number" },
  { regex: /[^A-Za-z0-9]/, key: "auth.passwordRules.special" },
];

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [isResetComplete, setIsResetComplete] = useState(false);
  const { toast } = useToast();

  const resetPasswordSchema = z.object({
    password: z.string()
      .min(8, "auth.passwordRules.minLength")
      .regex(/[A-Z]/, "auth.passwordRules.uppercase")
      .regex(/[a-z]/, "auth.passwordRules.lowercase")
      .regex(/[0-9]/, "auth.passwordRules.number")
      .regex(/[^A-Za-z0-9]/, "auth.passwordRules.special"),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "auth.passwordsDontMatch",
    path: ["confirmPassword"],
  });

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");

  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    let strength = 0;
    passwordRequirements.forEach(req => {
      if (req.regex.test(password)) strength++;
    });
    return strength;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return "bg-red-500";
    if (strength <= 3) return "bg-yellow-500";
    if (strength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return t("auth.passwordStrength.weak");
    if (strength <= 3) return t("auth.passwordStrength.fair");
    if (strength <= 4) return t("auth.passwordStrength.good");
    return t("auth.passwordStrength.strong");
  };

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/verify-reset-token/${token}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid reset token');
        }

        const data = await response.json();
        setIsValidToken(true);
        setUserEmail(data.email);
        setUserFirstName(data.firstName);
      } catch (error) {
        console.error('Token verification error:', error);
        setIsValidToken(false);
        toast({
          title: t("auth.resetPassword.invalidLinkTitle"),
          description: error instanceof Error ? error.message : t("auth.resetPassword.invalidLinkDescription"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, toast]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      toast({
        title: t("auth.resetPassword.successTitle"),
        description: t("auth.resetPassword.successDescription"),
      });

      setIsResetComplete(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: t("auth.resetPassword.failureTitle"),
        description: error instanceof Error ? error.message : t("auth.resetPassword.failureDescription"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">{t("auth.resetPassword.verifyingLink")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="bg-red-100 p-3 rounded-full w-fit mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t("auth.resetPassword.invalidLinkTitle")}</h2>
              <p className="text-gray-600">
                {t("auth.resetPassword.invalidLinkBody")}
              </p>
              <Button
                onClick={() => window.location.href = '/auth'}
                className="w-full"
              >
                {t("auth.resetPassword.backToLogin")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isResetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">{t("auth.resetPassword.completeTitle")}</CardTitle>
            <CardDescription>
              {t("auth.resetPassword.completeDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-800">
                  <strong>{t("auth.resetPassword.successBadge")}</strong> {t("auth.resetPassword.successMessage")}
                </p>
                <p className="text-green-700 text-sm mt-1">
                  {t("auth.resetPassword.successFollowUp")}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => window.location.href = '/auth'}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {t("auth.resetPassword.goToLogin")}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  {t("auth.resetPassword.backToHome")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit">
            <Key className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("auth.resetPassword.title")}</CardTitle>
          <CardDescription>
            {t("auth.resetPassword.greeting").replace("{{name}}", userFirstName || t("auth.resetPassword.userFallback"))}
          </CardDescription>
          <p className="text-sm text-gray-500">{userEmail}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordSetup.enterNewPassword")}
                  {...form.register("password")}
                  className={`pr-10 ${form.formState.errors.password ? "border-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{t(form.formState.errors.password.message)}</p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">{t("auth.resetPassword.passwordStrengthLabel")}</Label>
                  <span className="text-sm font-medium">{getPasswordStrengthText(getPasswordStrength(password))}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(getPasswordStrength(password))}`}
                    style={{ width: `${(getPasswordStrength(password) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Password Requirements */}
            {password && (
              <div className="space-y-2">
                <Label className="text-sm">{t("auth.passwordSetup.requirementsTitle")}</Label>
                <div className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.regex.test(password) ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <X className="h-3 w-3 text-gray-400" />
                      )}
                      <span className={req.regex.test(password) ? "text-green-600" : "text-gray-600"}>
                        {t(req.key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.resetPassword.confirmNewPassword")}
                  {...form.register("confirmPassword")}
                  className={`pr-10 ${form.formState.errors.confirmPassword ? "border-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">{t(form.formState.errors.confirmPassword.message)}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("auth.resetPassword.resetting") : t("auth.resetPassword.submit")}
            </Button>
          </form>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.location.href = '/auth'}
              className="text-blue-600 hover:text-blue-800"
            >
              {t("auth.resetPassword.backToLogin")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}