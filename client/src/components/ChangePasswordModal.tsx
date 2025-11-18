import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      return await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  // Form validation requirements display
  const passwordRequirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "One number", test: (pw: string) => /[0-9]/.test(pw) },
    { label: "One special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
  ];

  const currentNewPassword = form.watch('newPassword');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 rtl:space-x-reverse">
            <Lock className="h-5 w-5" />
            <span>Change Password</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                className="pr-10"
                {...form.register('currentPassword')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-red-500">{form.formState.errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="pr-10"
                {...form.register('newPassword')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.newPassword && (
              <p className="text-sm text-red-500">{form.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="pr-10"
                {...form.register('confirmPassword')}
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
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-700">Password Requirements</p>
            <div className="space-y-1">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center text-xs">
                  <CheckCircle2
                    className={`w-3 h-3 mr-2 ${req.test(currentNewPassword) ? 'text-green-500' : 'text-gray-300'}`}
                  />
                  <span className={req.test(currentNewPassword) ? 'text-green-700' : 'text-gray-500'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
