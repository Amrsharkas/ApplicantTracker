import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIInterviewInitiation() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const initiateAIInterview = async () => {
      try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          toast({
            title: "Error",
            description: "Missing initiation token. Please check your link and try again.",
            variant: "destructive",
          });
          window.location.href = '/';
          return;
        }

        // Call the AI interview initiation endpoint
        const response = await fetch(`/api/ai-interview-initation?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const responseData = await response.json();

          if (responseData.success && responseData.redirect) {
            // Success - redirect to dashboard
            toast({
              title: "Profile Generated",
              description: "Your profile has been successfully created based on your resume.",
            });
            // window.location.href = responseData.redirect;
          } else {
            throw new Error('Invalid response format');
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          toast({
            title: "Initiation Failed",
            description: errorData.error || "Failed to initiate interview process. Please try again.",
            variant: "destructive",
          });
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error during AI interview initiation:', error);
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
        window.location.href = '/';
      } finally {
        setIsProcessing(false);
      }
    };

    initiateAIInterview();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        {/* Loading Spinner */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50"></div>
          <div className="relative bg-blue-600 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900">
          Generating Your Profile
        </h1>

        {/* Description */}
        <p className="text-gray-600 max-w-md">
          We're creating your professional profile based on the resume you provided. This usually takes 30-60 seconds. Please keep this tab open.
        </p>

        {/* Status messages */}
        <div className="space-y-2">
          <p className="text-sm text-blue-600">Analyzing your resume...</p>
          <p className="text-sm text-indigo-600">Building your professional profile...</p>
          <p className="text-sm text-purple-600">Preparing your interview workspace...</p>
        </div>
      </div>
    </div>
  );
}