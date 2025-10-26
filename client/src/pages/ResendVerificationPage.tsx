import { Button } from "@/components/ui/button";
import ResendVerificationForm from "@/components/ResendVerificationForm";
import { ArrowLeft } from "lucide-react";

export default function ResendVerificationPage() {
  const handleBack = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </div>

        <ResendVerificationForm onBack={handleBack} />
      </div>
    </div>
  );
}