
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EsportPage from "./pages/EsportPage";
import MatchDetailsPage from "./pages/MatchDetailsPage";
import ApiKeyProvider from "./components/ApiKeyProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 300000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ApiKeyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/esports/:esportId" element={<EsportPage />} />
            <Route path="/match/:matchId" element={<MatchDetailsPage />} />
            {/* Redirect from /esports to the default esport (csgo) */}
            <Route path="/esports" element={<Navigate to="/esports/csgo" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ApiKeyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
