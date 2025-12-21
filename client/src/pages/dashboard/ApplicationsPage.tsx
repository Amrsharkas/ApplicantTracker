import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Filter,
  Briefcase,
  ListChecks,
  Target,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

export default function ApplicationsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/applications"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return apiRequest(`/api/applications/${applicationId}/withdraw`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({ title: "Application withdrawn successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setWithdrawingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to withdraw application",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredApplications = (applications as any[]).filter((app) => {
    if (filter === "all") return true;
    return app.status?.toLowerCase() === filter;
  });

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "pending";
    switch (statusLower) {
      case "accepted":
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "rejected":
      case "denied":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "shortlisted":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-0">
            <AlertCircle className="w-3 h-3 mr-1" />
            Shortlisted
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || "pending";
    switch (statusLower) {
      case "accepted":
      case "approved":
        return "bg-emerald-500";
      case "rejected":
      case "denied":
        return "bg-red-500";
      case "shortlisted":
        return "bg-blue-500";
      default:
        return "bg-amber-500";
    }
  };

  const getProgressStage = (status: string) => {
    const statusLower = status?.toLowerCase() || "pending";
    switch (statusLower) {
      case "accepted":
      case "approved":
        return 100;
      case "shortlisted":
        return 66;
      case "pending":
        return 33;
      case "rejected":
      case "denied":
        return 100;
      default:
        return 33;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const stats = {
    total: (applications as any[]).length,
    pending: (applications as any[]).filter((a) => !a.status || a.status.toLowerCase() === "pending" || a.status.toLowerCase() === "new").length,
    shortlisted: (applications as any[]).filter((a) => a.status?.toLowerCase() === "shortlisted").length,
    accepted: (applications as any[]).filter((a) => a.status?.toLowerCase() === "accepted" || a.status?.toLowerCase() === "approved").length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Applications
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your job applications and their status
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Applications</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-linear-to-br from-slate-400 to-slate-600 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-slate-400 to-slate-600"></div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/60 dark:border-amber-800/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-300 mt-2">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 dark:from-amber-600 dark:to-orange-700 flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-amber-400 to-orange-500"></div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/60 dark:border-blue-800/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Shortlisted</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-300 mt-2">{stats.shortlisted}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center shadow-lg">
                  <ListChecks className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-blue-400 to-indigo-500"></div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200/60 dark:border-emerald-800/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Accepted</p>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-300 mt-2">{stats.accepted}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-emerald-400 to-teal-500"></div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-3 shadow-xs"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          Filter:
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                All Applications
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending
              </div>
            </SelectItem>
            <SelectItem value="shortlisted">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-500" />
                Shortlisted
              </div>
            </SelectItem>
            <SelectItem value="accepted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Accepted
              </div>
            </SelectItem>
            <SelectItem value="rejected">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Rejected
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-slate-500 dark:text-slate-400 ml-2">
          {filteredApplications.length} {filteredApplications.length === 1 ? 'result' : 'results'}
        </div>
      </motion.div>

      {/* Applications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {isLoading ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 mx-auto"></div>
              <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium">Loading applications...</p>
            </CardContent>
          </Card>
        ) : filteredApplications.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-16 text-center">
              <div className="max-w-sm mx-auto">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full"></div>
                  <div className="absolute inset-2 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <Inbox className="w-12 h-12 text-slate-400 dark:text-slate-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  No applications found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {filter === "all"
                    ? "Start your job search journey by browsing available positions"
                    : `No ${filter} applications at the moment`}
                </p>
                {filter === "all" && (
                  <Link href="/dashboard/jobs">
                    <Button className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Browse Jobs
                    </Button>
                  </Link>
                )}
                {filter !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setFilter("all")}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application, index) => (
              <motion.div
                key={application.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(application.status)}`}></div>

                  <CardContent className="p-6 pl-8">
                    <div className="flex items-start gap-4">
                      {/* Company Logo Placeholder */}
                      <div className="shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                          <Building2 className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                        </div>
                      </div>

                      {/* Application Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {application.jobTitle || "Job Position"}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Building2 className="w-4 h-4" />
                              <span className="font-medium">{application.companyName || "Company"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(application.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/jobs/${application.jobId}`}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Job Details
                                  </Link>
                                </DropdownMenuItem>
                                {application.status?.toLowerCase() === "pending" && (
                                  <DropdownMenuItem
                                    className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                                    onClick={() => setWithdrawingId(application.id)}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Withdraw Application
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Application Meta Info */}
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>Applied {formatDate(application.appliedAt)}</span>
                          </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-600 dark:text-slate-400">Application Progress</span>
                            <span className="text-slate-700 dark:text-slate-300">{getProgressStage(application.status)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${getProgressStage(application.status)}%` }}
                              transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: "easeOut" }}
                              className={`h-full ${getStatusColor(application.status)} rounded-full relative`}
                            >
                              <div className="absolute inset-0 bg-linear-to-r from-transparent to-white/30"></div>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  {/* Hover Arrow */}
                  <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={!!withdrawingId} onOpenChange={() => setWithdrawingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => withdrawingId && withdrawMutation.mutate(withdrawingId)}
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
