import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || window.location.pathname.split('/').pop();

        if (!token) {
          setStatus('error');
          setMessage('Verification token is missing. Please check your email and try again.');
          return;
        }

        // Call verification API
        const response = await fetch(`/api/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
          // Invalidate user query to refresh authentication state
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        } else {
          setStatus('error');
          setMessage(data.error || 'Email verification failed. Please try again or contact support.');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('An error occurred during email verification. Please try again or contact support.');
      }
    };

    verifyEmail();
  }, [setLocation]);

  const handleContinue = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
            status === 'success'
              ? 'bg-green-100'
              : status === 'error'
              ? 'bg-red-100'
              : 'bg-blue-100'
          }`}>
            {status === 'loading' && (
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl text-gray-900">
            {status === 'loading' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Please wait while we verify your email address...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Sign in to your Plato Applicant Tracker account</li>
                  <li>• Complete your applicant profile</li>
                  <li>• Upload your resume and get matched with jobs</li>
                </ul>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Continue to Sign In
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>

              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Need Help?</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Make sure you clicked the complete verification link</li>
                  <li>• Check if the verification link has expired</li>
                  <li>• Contact support if the problem persists</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => window.location.href = '/resend-verification'}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </Button>

                <Button
                  onClick={handleContinue}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}