import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSetPassword } from "@/hooks/useAuth";

type PasswordSetupFormData = {
  password: string;
  confirmPassword: string;
};

interface PasswordSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordSetupModal({ isOpen, onClose, onSuccess }: PasswordSetupModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const setPasswordMutation = useSetPassword();

  const passwordSchema = z.object({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  const passwordForm = useForm<PasswordSetupFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmitPassword = async (data: PasswordSetupFormData) => {
    setPasswordMutation.mutate(data.password, {
      onSuccess: () => {
        onSuccess();
        onClose();
      }
    });
  };

  // Form validation requirements display
  const passwordRequirements = [
    { text: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { text: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { text: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { text: "One number", test: (pw: string) => /[0-9]/.test(pw) },
    { text: "One special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
  ];

  const currentPassword = passwordForm.watch('password');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Lock className="w-6 h-6" />
            Set Your Password
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            Please set a secure password for your account to continue.
          </p>
        </DialogHeader>

        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                className="pr-10"
                {...passwordForm.register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordForm.formState.errors.password && (
              <p className="text-sm text-red-500">{passwordForm.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className="pr-10"
                {...passwordForm.register('confirmPassword')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-700">Password requirements:</p>
            <div className="space-y-1">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center text-xs">
                  <CheckCircle2
                    className={`w-3 h-3 mr-2 ${req.test(currentPassword) ? 'text-green-500' : 'text-gray-300'}`}
                  />
                  <span className={req.test(currentPassword) ? 'text-green-700' : 'text-gray-500'}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={setPasswordMutation.isPending}
          >
            {setPasswordMutation.isPending ? "Setting Password..." : "Set Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}