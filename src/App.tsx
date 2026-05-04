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

const protect = (el: JSX.Element, requireCoach = false) => (
  <ProtectedRoute requireCoach={requireCoach}>{el}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={protect(<Index />)} />
            <Route path="/checkin" element={protect(<CheckIn />)} />
            <Route path="/scanner" element={protect(<Scanner />)} />
            <Route path="/coach" element={protect(<Coach />)} />
            <Route path="/correlations" element={protect(<Correlations />)} />
            <Route path="/nudges" element={protect(<Nudges />)} />
            <Route path="/coaches" element={protect(<CoachDashboard />, true)} />
            <Route path="/lci" element={protect(<LCI />)} />
            <Route path="/lci/new" element={protect(<LCINew />)} />
            <Route path="/actions" element={protect(<Actions />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
