import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  MapPin, 
  DollarSign, 
  Calendar, 
  Building, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText
} from "lucide-react";

interface Application {
  id: number;
  status: string;
  appliedAt: string;
  coverLetter?: string;
  notes?: string;
  job: {
    id: number;
    title: string;
    company: string;
    description: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string;
    skills?: string[];
    jobType?: string;
  };
}

interface ApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationsModal({ isOpen, onClose }: ApplicationsModalProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["/api/applications"],
    enabled: isOpen,
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

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return "bg-blue-100 text-blue-700 border-blue-200";
      case 'reviewed':
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case 'interviewed':
        return "bg-purple-100 text-purple-700 border-purple-200";
      case 'offered':
        return "bg-green-100 text-green-700 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return <FileText className="w-4 h-4" />;
      case 'reviewed':
        return <Eye className="w-4 h-4" />;
      case 'interviewed':
        return <Clock className="w-4 h-4" />;
      case 'offered':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredApplications = applications.filter((app: Application) => {
    if (statusFilter === "all") return true;
    return app.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const getApplicationStats = () => {
    const stats = applications.reduce((acc: any, app: Application) => {
      const status = app.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: applications.length,
      applied: stats.applied || 0,
      reviewed: stats.reviewed || 0,
      interviewed: stats.interviewed || 0,
      offered: stats.offered || 0,
      rejected: stats.rejected || 0,
    };
  };

  const stats = getApplicationStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            My Applications
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Application Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Applied</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.reviewed}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Reviewed</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.interviewed}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Interviewed</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.offered}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Offered</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Rejected</div>
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
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="offered">Offered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {statusFilter === "all" ? "No applications yet" : `No ${statusFilter} applications`}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {statusFilter === "all" 
                    ? "Start applying to jobs to see them here"
                    : `You have no applications with ${statusFilter} status`
                  }
                </p>
              </div>
            ) : (
              filteredApplications.map((application: Application, index: number) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
                              {application.job.title}
                            </h3>
                            <Badge className={`${getStatusColor(application.status)} border`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(application.status)}
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            <p className="text-blue-600 dark:text-blue-400 font-medium">
                              {application.job.company}
                            </p>
                          </div>
                          
                          <p className="text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                            {application.job.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{application.job.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>{formatSalary(application.job.salaryMin, application.job.salaryMax)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Applied {formatDate(application.appliedAt)}</span>
                            </div>
                            {application.job.jobType && (
                              <Badge variant="outline" className="capitalize">
                                {application.job.jobType}
                              </Badge>
                            )}
                          </div>

                          {application.job.skills && application.job.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {application.job.skills.slice(0, 4).map((skill) => (
                                <Badge 
                                  key={skill} 
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {application.job.skills.length > 4 && (
                                <Badge variant="outline">
                                  +{application.job.skills.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {application.coverLetter && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mt-3">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Cover Letter:
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                {application.coverLetter}
                              </p>
                            </div>
                          )}

                          {application.notes && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mt-3">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                Notes:
                              </p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                {application.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
