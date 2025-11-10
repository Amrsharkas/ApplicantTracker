import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ManualCVForm } from "./ManualCVForm";
import { FileText, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ManualCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCVCompleted: () => void;
}

export function ManualCVModal({ isOpen, onClose, onCVCompleted }: ManualCVModalProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const { t } = useLanguage();

  const handleCVCompletion = () => {
    setIsCompleting(true);
    onCVCompleted();
    setIsCompleting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <DialogTitle className="text-xl font-semibold">{t("manualCvModal.title")}</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {t("manualCvModal.subtitle")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="mt-6">
          <ManualCVForm 
            onComplete={handleCVCompletion}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}