import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

interface UploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface CareerInsightsUploaderProps {
  onUploadComplete: (result: UploadResult) => void;
  onCancel: () => void;
  isAnalyzing?: boolean;
}

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CareerInsightsUploader({
  onUploadComplete,
  onCancel,
  isAnalyzing = false
}: CareerInsightsUploaderProps) {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return t('careerInsights.invalidFileType') || 'Invalid file type. Please upload PDF, DOCX, DOC, or TXT files.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('careerInsights.fileTooLarge') || 'File too large. Maximum size is 10MB.';
    }
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Upload file directly to server
      setUploadProgress(10);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/career-insights/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      setUploadProgress(70);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload file');
      }

      const { filePath, fileName, fileSize, mimeType } = await uploadResponse.json();
      setUploadProgress(100);

      // Success! Pass the result to parent
      onUploadComplete({
        filePath,
        fileName,
        fileSize,
        mimeType
      });

      toast({
        title: t('careerInsights.uploadSuccess') || "File uploaded successfully",
        description: t('careerInsights.analyzingDocument') || "Analyzing your document...",
      });

    } catch (error) {
      console.error('Upload error:', error);
      setError(
        error instanceof Error
          ? error.message
          : (t('careerInsights.uploadFailed') || 'Failed to upload file. Please try again.')
      );
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
  };

  const getFileIcon = (mimeType: string) => {
    switch (mimeType) {
      case 'application/pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return <FileText className="h-8 w-8 text-blue-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mb-6"></div>
          <FileText className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-lg text-gray-600 font-medium">
          {t('careerInsights.analyzingDocument') || "Analyzing your document..."}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {t('careerInsights.analyzingDescription') || "This may take a moment. We're extracting insights from your document."}
        </p>
      </div>
    );
  }

  return (
    <div className={`py-6 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={isUploading}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('careerInsights.backToSelection') || "Back to Selection"}
      </Button>

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {t('careerInsights.uploadYourDocument') || "Upload Your Document"}
        </h3>
        <p className="text-gray-600">
          {t('careerInsights.uploadDescription') || "Upload a resume, CV, cover letter, or any career-related document"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Drop Zone */}
      {!selectedFile ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
            ${isDragging
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`
              rounded-full p-4 transition-colors duration-300
              ${isDragging ? 'bg-purple-200' : 'bg-purple-100'}
            `}>
              <Upload className={`h-8 w-8 ${isDragging ? 'text-purple-700' : 'text-purple-600'}`} />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-700 mb-1">
                {t('careerInsights.dragAndDrop') || "Drag and drop your file here"}
              </p>
              <p className="text-sm text-gray-500">
                {t('careerInsights.orBrowse') || "or click to browse"}
              </p>
            </div>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept={Object.values(ACCEPTED_TYPES).join(',')}
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button asChild variant="outline" className="cursor-pointer">
                <span>
                  {t('careerInsights.selectFile') || "Select File"}
                </span>
              </Button>
            </label>

            <p className="text-xs text-gray-400 mt-2">
              {t('careerInsights.supportedFormats') || "Supported: PDF, DOCX, DOC, TXT (max 10MB)"}
            </p>
          </div>
        </motion.div>
      ) : (
        /* Selected File Preview */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border rounded-xl p-6 bg-gray-50"
        >
          <div className="flex items-center gap-4">
            {getFileIcon(selectedFile.type)}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>

            {!isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{t('careerInsights.uploading') || "Uploading..."}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-linear-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          {!isUploading && (
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={clearFile}
                className="flex-1"
              >
                {t('careerInsights.changeFile') || "Change File"}
              </Button>
              <Button
                onClick={handleUpload}
                className="flex-1 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('careerInsights.uploadAndAnalyze') || "Upload & Analyze"}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
