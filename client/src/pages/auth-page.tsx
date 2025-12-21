import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogin, useRegister } from "@/hooks/useAuth";
import { Eye, EyeOff, Briefcase, Users, Zap } from "lucide-react";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { useLanguage } from "@/contexts/LanguageContext";

const loginSchema = z.object({
  email: z.string().email("auth.invalidEmail"),
  password: z.string().min(1, "auth.passwordRequired"),
});

const registerSchema = z.object({
  email: z.string().email("auth.invalidEmail"),
  password: z.string().min(6, "auth.passwordMinLength"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "auth.firstNameRequired"),
  lastName: z.string().min(1, "auth.lastNameRequired"),
  username: z.string().min(3, "auth.usernameMinLength").optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "auth.passwordsDontMatch",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { t } = useLanguage();
  
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      username: "",
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900">
                {t("auth.page.heroTitlePrefix")} <span className="text-blue-600">{t("plato")}</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {t("auth.page.heroSubtitle")}
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start space-x-4 rtl:space-x-reverse">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("auth.page.features.interviews.title")}</h3>
                  <p className="text-gray-600">{t("auth.page.features.interviews.description")}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 rtl:space-x-reverse">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("auth.page.features.matching.title")}</h3>
                  <p className="text-gray-600">{t("auth.page.features.matching.description")}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 rtl:space-x-reverse">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("auth.page.features.applications.title")}</h3>
                  <p className="text-gray-600">{t("auth.page.features.applications.description")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Forms */}
          <div className="max-w-md mx-auto w-full">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.signIn")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.signUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("auth.page.login.title")}</CardTitle>
                    <CardDescription>
                      {t("auth.page.login.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">{t("auth.email")}</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder={t("auth.enterEmail")}
                          {...loginForm.register("email")}
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-red-600">
                            {t(loginForm.formState.errors.email.message)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">{t("auth.password")}</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.enterPassword")}
                            {...loginForm.register("password")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-red-600">
                            {t(loginForm.formState.errors.password.message)}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? t("auth.signingIn") : t("auth.signIn")}
                      </Button>

                      {/* Forgot Password Link */}
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {t("auth.page.login.forgotPassword")}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("auth.page.register.title")}</CardTitle>
                    <CardDescription>
                      {t("auth.page.register.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                          <Input
                            id="firstName"
                            placeholder={t("auth.page.register.placeholders.firstNameExample")}
                            {...registerForm.register("firstName")}
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-red-600">
                              {t(registerForm.formState.errors.firstName.message)}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                          <Input
                            id="lastName"
                            placeholder={t("auth.page.register.placeholders.lastNameExample")}
                            {...registerForm.register("lastName")}
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-sm text-red-600">
                              {t(registerForm.formState.errors.lastName.message)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email">{t("auth.email")}</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder={t("auth.page.register.placeholders.emailExample")}
                          {...registerForm.register("email")}
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-red-600">
                            {t(registerForm.formState.errors.email.message)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username">{t("auth.usernameOptional")}</Label>
                        <Input
                          id="username"
                          placeholder={t("auth.page.register.placeholders.usernameExample")}
                          {...registerForm.register("username")}
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-sm text-red-600">
                            {t(registerForm.formState.errors.username.message)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password">{t("auth.password")}</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.page.register.placeholders.passwordExample")}
                            {...registerForm.register("password")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <p className="text-sm text-red-600">
                            {t(registerForm.formState.errors.password.message)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("auth.confirmYourPassword")}
                            {...registerForm.register("confirmPassword")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-red-600">
                            {t(registerForm.formState.errors.confirmPassword.message)}
                          </p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? t("auth.signingUp") : t("auth.createAccount")}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowForgotPassword(false)}
      />
    </div>
  );
}