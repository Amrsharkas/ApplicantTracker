import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmailVerificationPendingPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const { t } = useLanguage();

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: 'error', text: t('auth.verification.pending.enterEmailPrompt') });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || t('auth.verification.pending.resendFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('auth.verification.pending.resendError') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">{t('auth.verification.sent.title')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong className="text-green-600">{t('auth.verification.pending.registrationSuccess')}</strong> {t('auth.verification.pending.registrationMessage')}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{t('auth.verification.sent.steps.checkInbox')}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{t('auth.verification.sent.steps.clickLink')}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{t('auth.verification.sent.steps.startUsing')}</span>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>{t('auth.verification.sent.importantLabel')}</strong> {t('auth.verification.sent.importantMessage')}
            </p>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              <AlertDescription>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="email" className="text-sm text-gray-700">
                {t('auth.verification.pending.formTitle')}
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                {t('auth.verification.pending.formSubtitle')}
              </p>
              <form onSubmit={handleResendVerification} className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('auth.verification.sent.resendButton')
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="text-center space-y-2">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              {t('auth.verification.pending.continueToDashboard')}
            </Button>
            <Button
              variant="link"
              onClick={() => window.location.href = '/'}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {t('auth.verification.sent.backToSignIn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}