import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Calendar, 
  Building, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface AirtableApplication {
  recordId: string;
  jobTitle: string;
  jobId: string;
  companyName: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'closed' | 'denied';
  notes?: string;
  jobDescription?: string;
}

interface ApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationsModal({ isOpen, onClose }: ApplicationsModalProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/applications"],
    enabled: isOpen,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      case 'denied':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      accepted: { variant: "default" as const, color: "bg-green-100 text-green-800", label: "Accepted" },
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      closed: { variant: "outline" as const, color: "bg-gray-100 text-gray-800", label: "Closed" },
      denied: { variant: "destructive" as const, color: "bg-red-100 text-red-800", label: "Denied" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredApplications = applications.filter((app: AirtableApplication) => {
    if (statusFilter === "all") return true;
    return app.status === statusFilter;
  });

  const getApplicationStats = () => {
    const stats = applications.reduce((acc: any, app: AirtableApplication) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: applications.length,
      accepted: stats.accepted || 0,
      pending: stats.pending || 0,
      closed: stats.closed || 0,
      denied: stats.denied || 0,
    };
  };

  const stats = getApplicationStats();

  const handleManualRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Applications have been updated",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              My Applications
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Application Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.total}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Accepted</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Pending</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Closed</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Denied</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter by status:
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {statusFilter === "all" ? "No Applications Yet" : `No ${statusFilter} Applications`}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {statusFilter === "all" 
                    ? "Start applying to jobs to see your applications here"
                    : `You don't have any ${statusFilter} applications`
                  }
                </p>
              </div>
            ) : (
              filteredApplications.map((application: AirtableApplication) => (
                <motion.div
                  key={application.recordId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {application.jobTitle}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {application.companyName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Applied {formatDate(application.appliedAt)}
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {application.status === 'pending' && (
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Withdraw
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}