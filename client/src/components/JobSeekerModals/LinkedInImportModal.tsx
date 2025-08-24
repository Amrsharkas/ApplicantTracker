import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ExternalLink, Copy, CheckCircle, AlertTriangle, Linkedin } from "lucide-react";

interface LinkedInImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LinkedInParseResponse {
  message: string;
  profile: any;
  linkedinData: any;
  fieldsUpdated: number;
}

export function LinkedInImportModal({ isOpen, onClose }: LinkedInImportModalProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profileText, setProfileText] = useState("");
  const [activeTab, setActiveTab] = useState("url");
  const [importResult, setImportResult] = useState<LinkedInParseResponse | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const urlImportMutation = useMutation({
    mutationFn: async (data: { linkedinUrl: string }) => {
      return apiRequest("/api/linkedin/parse-url", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: LinkedInParseResponse) => {
      setImportResult(result);
      toast({
        title: "LinkedIn Import Successful!",
        description: `Updated ${result.fieldsUpdated} profile fields from LinkedIn`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
    },
    onError: (error: any) => {
      console.error("LinkedIn URL import error:", error);
      const errorMessage = error.message || "Failed to import from LinkedIn URL";
      const suggestion = error.suggestion || "";
      
      toast({
        title: "LinkedIn Import Failed",
        description: `${errorMessage}${suggestion ? ` ${suggestion}` : ""}`,
        variant: "destructive",
      });
    },
  });

  const textImportMutation = useMutation({
    mutationFn: async (data: { profileText: string; linkedinUrl?: string }) => {
      return apiRequest("/api/linkedin/parse-text", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: LinkedInParseResponse) => {
      setImportResult(result);
      toast({
        title: "LinkedIn Import Successful!",
        description: `Updated ${result.fieldsUpdated} profile fields from LinkedIn content`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
    },
    onError: (error: any) => {
      console.error("LinkedIn text import error:", error);
      toast({
        title: "LinkedIn Import Failed",
        description: error.message || "Failed to parse LinkedIn profile content",
        variant: "destructive",
      });
    },
  });

  const handleUrlImport = () => {
    if (!linkedinUrl.trim()) {
      toast({
        title: "LinkedIn URL Required",
        description: "Please enter your LinkedIn profile URL",
        variant: "destructive",
      });
      return;
    }

    urlImportMutation.mutate({ linkedinUrl: linkedinUrl.trim() });
  };

  const handleTextImport = () => {
    if (!profileText.trim()) {
      toast({
        title: "Profile Content Required",
        description: "Please paste your LinkedIn profile content",
        variant: "destructive",
      });
      return;
    }

    textImportMutation.mutate({ 
      profileText: profileText.trim(),
      linkedinUrl: linkedinUrl.trim() || undefined
    });
  };

  const handleClose = () => {
    setLinkedinUrl("");
    setProfileText("");
    setImportResult(null);
    setActiveTab("url");
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Instructions copied successfully",
      variant: "default",
    });
  };

  const isLoading = urlImportMutation.isPending || textImportMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            <span>Import from LinkedIn</span>
          </DialogTitle>
        </DialogHeader>

        {importResult ? (
          // Success view
          <div className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Import Successful!</AlertTitle>
              <AlertDescription>
                Successfully imported your LinkedIn profile and updated {importResult.fieldsUpdated} profile fields.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Profile Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.profile?.completionPercentage || 0}%
                  </div>
                  <p className="text-sm text-gray-600">Profile completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fields Updated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.fieldsUpdated}
                  </div>
                  <p className="text-sm text-gray-600">Profile fields imported</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setImportResult(null)}>
                Import Another Profile
              </Button>
            </div>
          </div>
        ) : (
          // Import form
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>LinkedIn Import Options</AlertTitle>
              <AlertDescription>
                Choose your preferred method to import your LinkedIn profile. URL import may be blocked by LinkedIn's security measures.
              </AlertDescription>
            </Alert>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">LinkedIn URL</TabsTrigger>
                <TabsTrigger value="text">Profile Content</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Import from LinkedIn URL</CardTitle>
                    <CardDescription>
                      Enter your LinkedIn profile URL to automatically import your profile information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                      <Input
                        id="linkedinUrl"
                        type="url"
                        placeholder="https://www.linkedin.com/in/yourname"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        disabled={isLoading}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Make sure your LinkedIn profile is public or visible to everyone.
                      </p>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Note:</strong> LinkedIn may block automated access. If this method fails, try the "Profile Content" method instead.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      onClick={handleUrlImport}
                      disabled={isLoading || !linkedinUrl.trim()}
                      className="w-full"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Import from URL
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Import from Profile Content</CardTitle>
                    <CardDescription>
                      Copy and paste your LinkedIn profile content for more reliable parsing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="profileText">LinkedIn Profile Content</Label>
                      <Textarea
                        id="profileText"
                        placeholder="Paste your LinkedIn profile content here..."
                        value={profileText}
                        onChange={(e) => setProfileText(e.target.value)}
                        disabled={isLoading}
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Copy all the text from your LinkedIn profile page and paste it here.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="optionalUrl">LinkedIn URL (Optional)</Label>
                      <Input
                        id="optionalUrl"
                        type="url"
                        placeholder="https://www.linkedin.com/in/yourname"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <Button 
                      onClick={handleTextImport}
                      disabled={isLoading || !profileText.trim()}
                      className="w-full"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Parse Profile Content
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Copy className="h-4 w-4 mr-2" />
                      How to Copy LinkedIn Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-blue-600 mt-0.5">1.</span>
                        <div>
                          <p>Open your LinkedIn profile in a web browser</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-blue-600"
                            onClick={() => window.open('https://www.linkedin.com/in/me/', '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Go to LinkedIn
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-blue-600 mt-0.5">2.</span>
                        <p>Select all text on the page (Ctrl+A or Cmd+A)</p>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-blue-600 mt-0.5">3.</span>
                        <p>Copy the selected text (Ctrl+C or Cmd+C)</p>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-blue-600 mt-0.5">4.</span>
                        <p>Paste it in the text area above</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}