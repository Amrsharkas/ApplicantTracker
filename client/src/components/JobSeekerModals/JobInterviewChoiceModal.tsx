import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MessageSquare, 
  Globe,
  ArrowRight,
  Building2,
  BriefcaseIcon as Briefcase
} from "lucide-react";

interface JobInterviewChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
  jobRecordId: string;
  jobDescription?: string;
  jobRequirements?: string;
  onStartInterview: (mode: 'voice' | 'text', language: 'english' | 'arabic', jobData?: any) => void;
}

export function JobInterviewChoiceModal({
  isOpen,
  onClose,
  jobTitle,
  companyName,
  jobRecordId,
  jobDescription,
  jobRequirements,
  onStartInterview
}: JobInterviewChoiceModalProps) {
  const [selectedMode, setSelectedMode] = useState<'voice' | 'text' | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'arabic' | null>(null);

  const handleStartInterview = () => {
    if (selectedMode && selectedLanguage) {
      onStartInterview(selectedMode, selectedLanguage, {
        jobTitle,
        companyName,
        jobRecordId,
        jobDescription,
        jobRequirements
      });
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedMode(null);
    setSelectedLanguage(null);
    onClose();
  };

  const isReadyToStart = selectedMode && selectedLanguage;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <Briefcase className="h-6 w-6 text-blue-600" />
            Job Interview Setup
          </DialogTitle>
          <div className="mt-2">
            <p className="text-lg font-semibold text-gray-900">{jobTitle}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-gray-500" />
              <p className="text-gray-600">{companyName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">About This Interview</h3>
            <p className="text-blue-800 text-sm">
              This job-specific interview will assess your fit for the {jobTitle} position. 
              You'll answer 10 tailored questions designed to evaluate your skills, experience, 
              and qualifications relevant to this role.
            </p>
          </div>

          {/* Interview Mode Selection */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Choose Interview Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  selectedMode === 'voice' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedMode('voice')}
              >
                <CardContent className="p-4 text-center">
                  <Mic className={`h-8 w-8 mx-auto mb-2 ${
                    selectedMode === 'voice' ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <h4 className="font-semibold mb-1">Voice Interview</h4>
                  <p className="text-sm text-gray-600">
                    Speak naturally with the AI interviewer
                  </p>
                  {selectedMode === 'voice' && (
                    <Badge className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  selectedMode === 'text' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedMode('text')}
              >
                <CardContent className="p-4 text-center">
                  <MessageSquare className={`h-8 w-8 mx-auto mb-2 ${
                    selectedMode === 'text' ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <h4 className="font-semibold mb-1">Text Interview</h4>
                  <p className="text-sm text-gray-600">
                    Type your responses in a chat format
                  </p>
                  {selectedMode === 'text' && (
                    <Badge className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Choose Language</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  selectedLanguage === 'english' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedLanguage('english')}
              >
                <CardContent className="p-4 text-center">
                  <Globe className={`h-8 w-8 mx-auto mb-2 ${
                    selectedLanguage === 'english' ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <h4 className="font-semibold mb-1">English</h4>
                  <p className="text-sm text-gray-600">
                    Conduct the interview in English
                  </p>
                  {selectedLanguage === 'english' && (
                    <Badge className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  selectedLanguage === 'arabic' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedLanguage('arabic')}
              >
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl mx-auto mb-2 ${
                    selectedLanguage === 'arabic' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    ع
                  </div>
                  <h4 className="font-semibold mb-1">العربية</h4>
                  <p className="text-sm text-gray-600">
                    أجري المقابلة باللغة العربية
                  </p>
                  {selectedLanguage === 'arabic' && (
                    <Badge className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartInterview}
              disabled={!isReadyToStart}
              className="flex items-center gap-2"
            >
              Start Interview
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Selection Summary */}
          {isReadyToStart && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                <span className="font-medium">Ready to start:</span>
              </div>
              <div className="mt-2 text-green-700">
                <p className="text-sm">
                  {selectedMode === 'voice' ? 'Voice interview' : 'Text interview'} in{' '}
                  {selectedLanguage === 'english' ? 'English' : 'Arabic (العربية)'}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}