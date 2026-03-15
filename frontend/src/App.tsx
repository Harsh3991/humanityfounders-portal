import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Attendance from "./pages/Attendance";
import TaskOversight from "./pages/TaskOversight";
import People from "./pages/People";
import Leaves from "./pages/Leaves";
import LeaveManagement from "./pages/LeaveManagement";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  let content;
  if (!user) {
    content = <Login />;
  } else if (user.status === 'pending') {
    content = <Onboarding />;
  } else {
    content = (
      <Routes location={location}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/task-oversight" element={user.role === 'admin' ? <TaskOversight /> : <Navigate to="/dashboard" />} />
          <Route path="/people" element={user.role === 'admin' ? <People /> : <Navigate to="/dashboard" />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/leave-management" element={user.role === 'admin' || user.role === 'hr' ? <LeaveManagement /> : <Navigate to="/dashboard" />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      {content}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
