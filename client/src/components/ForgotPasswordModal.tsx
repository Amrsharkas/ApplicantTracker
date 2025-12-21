import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type ForgotPasswordFormData = {
  email: string;
};

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

const forgotPasswordSchema = z.object({
  email: z.string().email("auth.forgotPassword.invalidEmail"),
});

export function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }: ForgotPasswordModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const response = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send password reset email');
      }

      setIsSubmitted(true);
      toast({
        title: t("auth.forgotPassword.toastSuccessTitle"),
        description: t("auth.forgotPassword.toastSuccessDescription"),
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      toast({
        title: t("auth.forgotPassword.toastErrorTitle"),
        description: error instanceof Error ? error.message : t("auth.forgotPassword.toastErrorDescription"),
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    form.reset();
    onClose();
  };

  const handleBackToLogin = () => {
    setIsSubmitted(false);
    form.reset();
    onBackToLogin();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t("auth.forgotPassword.title")}
          </DialogTitle>
        </DialogHeader>

        {!isSubmitted ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                {t("auth.forgotPassword.description")}
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.forgotPassword.emailLabel")}</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.forgotPassword.emailPlaceholder")}
                    {...form.register("email")}
                    className={`pl-10 ${form.formState.errors.email ? "border-red-500" : ""}`}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{t(form.formState.errors.email.message)}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
              </Button>
            </form>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("auth.forgotPassword.backToLogin")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("auth.forgotPassword.successTitle")}
                </h3>
                <p className="text-gray-600">
                  {t("auth.forgotPassword.successDescription")}
                </p>
                <p className="text-sm text-gray-500">
                  {t("auth.forgotPassword.successNote")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>{t("auth.forgotPassword.tipsTitle")}</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• {t("auth.forgotPassword.tips.checkSpam")}</li>
                  <li>• {t("auth.forgotPassword.tips.confirmEmail")}</li>
                  <li>• {t("auth.forgotPassword.tips.requestAnother")}</li>
                </ul>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsSubmitted(false)}
              >
                {t("auth.forgotPassword.tryAnother")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full text-blue-600 hover:text-blue-800"
              >
                {t("auth.forgotPassword.backToLogin")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}