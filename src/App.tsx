import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CheckIn from "./pages/CheckIn";
import Scanner from "./pages/Scanner";
import Coach from "./pages/Coach";
import Correlations from "./pages/Correlations";
import Nudges from "./pages/Nudges";
import CoachDashboard from "./pages/CoachDashboard";
import LCI from "./pages/LCI";
import LCINew from "./pages/LCINew";
import Actions from "./pages/Actions";
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
            <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
            <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
            <Route path="/correlations" element={<ProtectedRoute><Correlations /></ProtectedRoute>} />
            <Route path="/nudges" element={<ProtectedRoute><Nudges /></ProtectedRoute>} />
            <Route
              path="/coaches"
              element={
                <ProtectedRoute allowedRoles={['coach', 'admin']}>
                  <CoachDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/lci" element={<ProtectedRoute><LCI /></ProtectedRoute>} />
            <Route path="/lci/new" element={<ProtectedRoute><LCINew /></ProtectedRoute>} />
            <Route path="/actions" element={<ProtectedRoute><Actions /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
