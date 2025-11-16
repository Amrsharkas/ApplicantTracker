import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResendVerificationFormProps {
  onBack?: () => void;
}

export default function ResendVerificationForm({ onBack }: ResendVerificationFormProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: 'error', text: t("auth.resendVerification.enterEmail") });
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
        setMessage({ type: 'error', text: data.error || t("auth.resendVerification.failure") });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t("auth.resendVerification.error") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-xl text-gray-900">{t("auth.resendVerification.title")}</CardTitle>
        <p className="text-sm text-gray-600">
          {t("auth.resendVerification.description")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.resendVerification.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.resendVerification.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.resendVerification.submitting")}
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {t("auth.resendVerification.submit")}
              </>
            )}
          </Button>
        </form>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? (
              <Mail className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t("auth.resendVerification.info")}
          </AlertDescription>
        </Alert>

        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("auth.resendVerification.back")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}