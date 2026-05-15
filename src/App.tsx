import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import { protectedRoutes } from "./routes/config";

const queryClient = new QueryClient();

const Shell = () => {
  const { pathname } = useLocation();
  const noChrome = pathname === "/auth" || pathname === "/onboarding" || pathname === "/reset-password";
  return (
    <>
      <DesktopNav />
      <div
        className={
          noChrome
            ? "min-h-screen"
            : "md:pl-60 pb-24 md:pb-0 min-h-screen"
        }
      >
        <div
          className={
            noChrome
              ? "w-full"
              : "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8"
          }
        >
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            {protectedRoutes.map(({ path, component: Component, allowedRoles }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute allowedRoles={allowedRoles}>
                    <Component />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      <BottomNav />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
