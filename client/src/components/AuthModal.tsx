import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogin, useRegister } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import GoogleSignInButton from "./GoogleSignInButton";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { isGoogleAuthError, getGoogleAuthError, clearGoogleAuthError, getGoogleAuthErrorMessage } from "@/lib/authUtils";
import { TERMS_OF_SERVICE_TEXT } from "@shared/terms";

type LoginFormData = {
  email: string;
  password: string;
};

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  username?: string;
  acceptedTerms: boolean;
  acceptedTermsText: string;
};

const REGISTER_DEFAULT_VALUES: RegisterFormData = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  username: "",
  acceptedTerms: false,
  acceptedTermsText: TERMS_OF_SERVICE_TEXT,
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}


export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const signInWithGoogle = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = '/auth/google';
  }

  React.useEffect(() => {
    if (isGoogleAuthError()) {
      const error = getGoogleAuthError();
      if (error) {
        toast({
          title: "Google Authentication Error",
          description: getGoogleAuthErrorMessage(error),
          variant: "destructive",
        });
        clearGoogleAuthError();
      }
    }
  }, [toast]);

  // Create schemas with translated error messages
  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(1, t('auth.passwordRequired')),
  });

  const registerSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordMinLength')),
    confirmPassword: z.string(),
    firstName: z.string().min(1, t('auth.firstNameRequired')),
    lastName: z.string().min(1, t('auth.lastNameRequired')),
    username: z.string().min(3, t('auth.usernameMinLength')).optional(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms to create an account" }),
    }),
    acceptedTermsText: z
      .string()
      .refine((value) => value === TERMS_OF_SERVICE_TEXT, {
        message: "Submitted terms do not match the current Terms of Service",
      }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { ...REGISTER_DEFAULT_VALUES },
  });

  const firstName = registerForm.watch("firstName") ?? "";
  const lastName = registerForm.watch("lastName") ?? "";
  const email = registerForm.watch("email") ?? "";
  const username = registerForm.watch("username") ?? "";
  const passwordValue = registerForm.watch("password") ?? "";
  const confirmPasswordValue = registerForm.watch("confirmPassword") ?? "";
  const acceptedTerms = registerForm.watch("acceptedTerms") ?? false;

  const isStepOneValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    username.trim().length >= 3 &&
    email.trim().length > 0;

  const resetRegisterFlow = React.useCallback(() => {
    registerForm.reset({ ...REGISTER_DEFAULT_VALUES });
    setCurrentStep(1);
    setStepError(null);
    setPasswordMatch(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [registerForm]);

  React.useEffect(() => {
    registerForm.register("acceptedTermsText");
  }, [registerForm]);

  React.useEffect(() => {
    registerForm.setValue("acceptedTermsText", TERMS_OF_SERVICE_TEXT);
  }, [registerForm]);

  React.useEffect(() => {
    if (currentStep === 1) {
      setPasswordMatch(true);
      return;
    }
    if (!confirmPasswordValue) {
      setPasswordMatch(true);
      return;
    }
    setPasswordMatch(passwordValue === confirmPasswordValue);
  }, [currentStep, passwordValue, confirmPasswordValue]);

  React.useEffect(() => {
    if (stepError && currentStep === 1) {
      setStepError(null);
    }
  }, [firstName, lastName, email, username, stepError, currentStep]);

  React.useEffect(() => {
    if (!isOpen) {
      resetRegisterFlow();
      setActiveTab("signin");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowForgotPassword(false);
    }
  }, [isOpen, resetRegisterFlow]);

  const handleTabChange = (value: string) => {
    const tab = value === "signup" ? "signup" : "signin";
    setActiveTab(tab);
    if (tab === "signin") {
      resetRegisterFlow();
    } else {
      setCurrentStep(1);
      setStepError(null);
      setPasswordMatch(true);
    }
  };

  const handleNextStep = async () => {
    const valid = await registerForm.trigger(["firstName", "lastName", "email", "username"], {
      shouldFocus: true,
    });
    if (!valid) {
      setStepError("Please complete all required fields before continuing.");
      return;
    }
    setStepError(null);
    setCurrentStep(2);
  };

  const handleBackStep = () => {
    setCurrentStep(1);
    setStepError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        onClose();
        window.location.reload(); // This will trigger the auth check and redirect to dashboard
      },
    });
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    if (currentStep === 1) {
      handleNextStep();
      return;
    }
    registerMutation.mutate(data, {
      onSuccess: () => {
        resetRegisterFlow();
        setActiveTab("signin");
        onClose();
        window.location.reload(); // This will trigger the auth check and redirect to dashboard
      },
    });
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
{t('auth.welcomeToPlato')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t('auth.email')}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={t('auth.enterEmail')}
                  {...loginForm.register("email")}
                  className={loginForm.formState.errors.email ? "border-red-500" : ""}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.enterPassword')}
                    {...loginForm.register("password")}
                    className={loginForm.formState.errors.password ? "border-red-500" : ""}
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
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {loginMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">
                    {loginMutation.error.message}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Forgot your password?
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <GoogleSignInButton onClick={(signInWithGoogle)} />
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                      <Input
                        id="firstName"
                        placeholder={t('auth.firstNamePlaceholder')}
                        {...registerForm.register("firstName")}
                        className={registerForm.formState.errors.firstName ? "border-red-500" : ""}
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                      <Input
                        id="lastName"
                        placeholder={t('auth.lastNamePlaceholder')}
                        {...registerForm.register("lastName")}
                        className={registerForm.formState.errors.lastName ? "border-red-500" : ""}
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t('auth.email')}</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder={t('auth.enterEmail')}
                      {...registerForm.register("email")}
                      className={registerForm.formState.errors.email ? "border-red-500" : ""}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">{t('auth.usernameOptional')}</Label>
                    <Input
                      id="username"
                      placeholder={t('auth.chooseUsername')}
                      {...registerForm.register("username")}
                      className={registerForm.formState.errors.username ? "border-red-500" : ""}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  {stepError && (
                    <p className="text-sm text-red-500">{stepError}</p>
                  )}
                </>
              )}

              {currentStep === 2 && (
                <>
                  <input type="hidden" {...registerForm.register("acceptedTermsText")} />
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth.createPassword')}
                        {...registerForm.register("password")}
                        className={`${registerForm.formState.errors.password ? "border-red-500" : ""}`}
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
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t('auth.confirmYourPassword')}
                        {...registerForm.register("confirmPassword")}
                        className={`${registerForm.formState.errors.confirmPassword || !passwordMatch ? "border-red-500" : ""}`}
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
                    {(!passwordMatch || registerForm.formState.errors.confirmPassword) && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.confirmPassword?.message || t('auth.passwordsDontMatch')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Terms of Service
                    </Label>
                    <ScrollArea className="h-48 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {TERMS_OF_SERVICE_TEXT}
                      </p>
                    </ScrollArea>
                    <div className="flex items-start gap-3">
                      <Controller
                        control={registerForm.control}
                        name="acceptedTerms"
                        defaultValue={false}
                        render={({ field }) => (
                          <Checkbox
                            id="acceptedTerms"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        )}
                      />
                      <Label htmlFor="acceptedTerms" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        I have read and agree to the Terms of Service above (printable version{' '}
                        <a href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
                          available here
                        </a>) and the{' '}
                        <a href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
                          Privacy Policy
                        </a>
                      </Label>
                    </div>
                    {(registerForm.formState.errors.acceptedTerms || registerForm.formState.errors.acceptedTermsText) && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.acceptedTerms?.message || registerForm.formState.errors.acceptedTermsText?.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              {registerMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">
                    {registerMutation.error.message}
                  </p>
                </div>
              )}

              <div className={`flex flex-col gap-3 ${currentStep === 2 ? "sm:flex-row" : ""}`}>
                {currentStep === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackStep}
                    disabled={registerMutation.isPending}
                    className="w-full"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type={currentStep === 2 ? "submit" : "button"}
                  onClick={currentStep === 1 ? handleNextStep : undefined}
                  disabled={
                    registerMutation.isPending ||
                    (currentStep === 1 ? !isStepOneValid : !passwordMatch || !acceptedTerms)
                  }
                  className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {currentStep === 1
                    ? "Continue"
                    : registerMutation.isPending
                      ? t('auth.signingUp')
                      : t('auth.createAccount')}
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <GoogleSignInButton onClick={(signInWithGoogle)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Forgot Password Modal */}
    <ForgotPasswordModal
      isOpen={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
      onBackToLogin={() => setShowForgotPassword(false)}
    />
    </>
  );
}