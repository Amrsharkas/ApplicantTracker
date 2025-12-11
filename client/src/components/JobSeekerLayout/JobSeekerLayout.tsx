import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JobSeekerHeader } from "./JobSeekerHeader";
import { JobSeekerSidebar } from "./JobSeekerSidebar";

interface JobSeekerLayoutProps {
  children: ReactNode;
  activePage: string;
}

export function JobSeekerLayout({ children, activePage }: JobSeekerLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
      {/* Sidebar */}
      <JobSeekerSidebar
        activePage={activePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content Wrapper */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <JobSeekerHeader onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            key={activePage}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
