import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function VerificationSentPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Get email from URL params or localStorage if available
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');

    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Try to get from localStorage as fallback
      const storedEmail = localStorage.getItem('pending_verification_email');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Email Sent Successfully</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Verification email has been sent successfully to your registered email address.
            </AlertDescription>
          </Alert>

          {email && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Email sent to:</strong> {email}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Check your email inbox</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Click verification link in email</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Start using Plato Applicant Tracker</span>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Important:</strong> If you don't receive the email within a few minutes, please check your spam folder. The verification link will expire in 1 week.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/resend-verification'}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Resend Email
            </Button>

            <Button
              onClick={() => window.location.href = '/auth'}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}