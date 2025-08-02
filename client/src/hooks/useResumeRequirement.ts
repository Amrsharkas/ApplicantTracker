import { useQuery } from "@tanstack/react-query";

interface ResumeCheckResponse {
  hasResume: boolean;
  resume: {
    id: string;
    originalName: string;
    uploadedAt: string;
  } | null;
}

export function useResumeRequirement() {
  const { data, isLoading, error } = useQuery<ResumeCheckResponse>({
    queryKey: ['/api/interview/resume-check'],
    retry: false,
  });

  return {
    hasResume: data?.hasResume ?? false,
    resume: data?.resume,
    isLoading,
    error,
    requiresResume: !data?.hasResume && !isLoading
  };
}