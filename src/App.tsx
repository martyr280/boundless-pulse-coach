import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import Auth from "./pages/Auth";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import { protectedRoutes } from "./routes/config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
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
          <BottomNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
