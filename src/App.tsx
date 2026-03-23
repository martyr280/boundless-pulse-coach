import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import CheckIn from "./pages/CheckIn";
import Scanner from "./pages/Scanner";
import Coach from "./pages/Coach";
import Correlations from "./pages/Correlations";
import Nudges from "./pages/Nudges";
import CoachDashboard from "./pages/CoachDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/correlations" element={<Correlations />} />
          <Route path="/nudges" element={<Nudges />} />
          <Route path="/coaches" element={<CoachDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
