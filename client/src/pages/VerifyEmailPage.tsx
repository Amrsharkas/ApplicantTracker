import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const statusTitle = useMemo(() => {
    if (status === 'loading') return t('auth.verifyEmail.status.loading.title');
    if (status === 'success') return t('auth.verifyEmail.status.success.title');
    return t('auth.verifyEmail.status.error.title');
  }, [status, t]);

  const nextSteps = useMemo(() => (
    [
      t('auth.verifyEmail.nextSteps.signIn'),
      t('auth.verifyEmail.nextSteps.completeProfile'),
      t('auth.verifyEmail.nextSteps.uploadResume'),
    ]
  ), [t]);

  const helpSteps = useMemo(() => (
    [
      t('auth.verifyEmail.help.items.ensureCompleteLink'),
      t('auth.verifyEmail.help.items.checkExpiry'),
      t('auth.verifyEmail.help.items.contactSupport'),
    ]
  ), [t]);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || window.location.pathname.split('/').pop();

        if (!token) {
          setStatus('error');
          setMessage(t('auth.verifyEmail.errors.missingToken'));
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
          setMessage(data.error || t('auth.verifyEmail.errors.failed'));
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(t('auth.verifyEmail.errors.unexpected'));
      }
    };

    verifyEmail();
  }, [queryClient, t]);

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
          <CardTitle className="text-2xl text-gray-900">{statusTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {t('auth.verifyEmail.status.loading.message')}
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
                <h3 className="font-semibold text-blue-900 mb-2">{t('auth.verifyEmail.nextSteps.title')}</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {nextSteps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {t('auth.verifyEmail.continueButton')}
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
                <h3 className="font-semibold text-amber-900 mb-2">{t('auth.verifyEmail.help.title')}</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  {helpSteps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => window.location.href = '/resend-verification'}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('auth.verification.sent.resendButton')}
                </Button>

                <Button
                  onClick={handleContinue}
                  className="w-full"
                >
                  {t('auth.verification.sent.backToSignIn')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}