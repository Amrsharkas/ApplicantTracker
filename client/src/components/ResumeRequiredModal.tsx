import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResumeUploader } from "./ResumeUploader";
import { FileText, AlertCircle } from "lucide-react";

interface ResumeRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeUploaded: () => void;
}

export function ResumeRequiredModal({
  isOpen,
  onClose,
  onResumeUploaded
}: ResumeRequiredModalProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = () => {
    setIsUploading(false);
    onResumeUploaded();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Resume Required
          </DialogTitle>
          <DialogDescription>
            To provide you with the most personalized and effective interview experience,
            we need your resume first. Our AI will analyze your background and tailor
            questions specifically to your experience and skills.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Why we need your resume:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Personalized interview questions based on your experience</li>
              <li>• Better job matching with relevant opportunities</li>
              <li>• More accurate skills assessment</li>
              <li>• Tailored career guidance and feedback</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Upload Your Resume
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Supported formats: PDF, DOC, DOCX (Max 10MB)
            </p>
            
            <ResumeUploader
              onUploadComplete={handleUploadComplete}
              disabled={isUploading}
              buttonText="Upload Resume to Continue"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}