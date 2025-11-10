import React from "react";
import { useParams } from "wouter";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.resetPassword.invalidLinkTitle")}</h1>
          <p className="text-gray-600">
            {t("auth.resetPassword.missingTokenMessage")}
          </p>
          <a
            href="/auth"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            {t("auth.resetPassword.backToLogin")}
          </a>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}