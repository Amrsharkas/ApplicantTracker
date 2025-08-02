import { useState } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploaderProps {
  onUploadComplete?: () => void;
  disabled?: boolean;
  buttonText?: string;
}

export function ResumeUploader({ 
  onUploadComplete, 
  disabled = false,
  buttonText = "Upload Resume"
}: ResumeUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['.pdf', '.doc', '.docx', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          try {
            const response = await apiRequest("/api/resume/upload-url", {
              method: "POST",
            });
            return {
              method: "PUT" as const,
              url: response.uploadURL,
            };
          } catch (error) {
            console.error("Error getting upload URL:", error);
            throw error;
          }
        },
      })
      .on("upload", () => {
        setIsUploading(true);
      })
      .on("complete", async (result) => {
        setIsUploading(false);
        
        if (result.successful.length > 0) {
          try {
            const uploadedFile = result.successful[0];
            
            // Process the uploaded resume
            await apiRequest("/api/resume/process", {
              method: "POST",
              body: JSON.stringify({
                filename: uploadedFile.name,
                uploadURL: uploadedFile.uploadURL,
                fileSize: uploadedFile.size,
                mimeType: uploadedFile.type,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            });

            toast({
              title: "Resume uploaded successfully",
              description: "Your resume has been uploaded and is being processed.",
            });

            setShowModal(false);
            onUploadComplete?.();
          } catch (error) {
            console.error("Error processing resume:", error);
            toast({
              title: "Upload error",
              description: "Resume uploaded but processing failed. Please try again.",
              variant: "destructive",
            });
          }
        }
      })
      .on("error", (error) => {
        setIsUploading(false);
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: "There was an error uploading your resume. Please try again.",
          variant: "destructive",
        });
      })
  );

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        disabled={disabled || isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Upload className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note="Only PDF, DOC, and DOCX files are supported. Maximum file size: 10MB."
      />
    </div>
  );
}