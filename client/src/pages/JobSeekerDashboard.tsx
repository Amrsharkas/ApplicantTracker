import { useMemo } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { JobSeekerLayout } from "@/components/JobSeekerLayout";
import DashboardOverview from "./dashboard/DashboardOverview";
import ProfilePage from "./dashboard/ProfilePage";
import ApplicationsPage from "./dashboard/ApplicationsPage";
import MatchesPage from "./dashboard/MatchesPage";
import JobsPage from "./dashboard/JobsPage";
import JobDetailsPage from "./dashboard/JobDetailsPage";
import InterviewsPage from "./dashboard/InterviewsPage";
import PracticePage from "./dashboard/PracticePage";
import CareerPage from "./dashboard/CareerPage";
import JobInterviewsPage from "./dashboard/JobInterviewsPage";

export default function JobSeekerDashboard() {
  const [location] = useLocation();

  // Determine active page for sidebar highlighting
  const activePage = useMemo(() => {
    const path = location;
    if (path === "/dashboard" || path === "/dashboard/") return "dashboard";
    if (path.includes("/dashboard/profile")) return "profile";
    if (path.includes("/dashboard/jobs")) return "jobs";
    if (path.includes("/dashboard/matches")) return "matches";
    if (path.includes("/dashboard/applications")) return "applications";
    if (path.includes("/dashboard/interviews")) return "interviews";
    if (path.includes("/dashboard/practice")) return "practice";
    if (path.includes("/dashboard/career")) return "career";
    if (path.includes("/dashboard/job-interviews")) return "job-interviews";
    return "dashboard";
  }, [location]);

  return (
    <JobSeekerLayout activePage={activePage}>
      <Switch>
        <Route path="/dashboard" component={DashboardOverview} />
        <Route path="/dashboard/profile" component={ProfilePage} />
        <Route path="/dashboard/jobs/:jobId" component={JobDetailsPage} />
        <Route path="/dashboard/jobs" component={JobsPage} />
        <Route path="/dashboard/matches" component={MatchesPage} />
        <Route path="/dashboard/applications" component={ApplicationsPage} />
        <Route path="/dashboard/interviews" component={InterviewsPage} />
        <Route path="/dashboard/practice" component={PracticePage} />
        <Route path="/dashboard/career" component={CareerPage} />
        <Route path="/dashboard/job-interviews" component={JobInterviewsPage} />
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </JobSeekerLayout>
  );
}
