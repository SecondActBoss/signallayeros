import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { VerticalBanner } from "@/components/vertical-banner";
import CoverPage from "@/pages/cover";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Signals from "@/pages/signals";
import Leads from "@/pages/leads";
import Content from "@/pages/content";
import Ingest from "@/pages/ingest";
import Prospects from "@/pages/prospects";
import GoogleMarketPull from "@/pages/google-market-pull";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/signals" component={Signals} />
      <Route path="/leads" component={Leads} />
      <Route path="/prospects" component={Prospects} />
      <Route path="/content" component={Content} />
      <Route path="/ingest" component={Ingest} />
      <Route path="/google-market-pull" component={GoogleMarketPull} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("slos_auth") === "1" || location !== "/"
  );

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  if (!authenticated) {
    return (
      <CoverPage
        onEnter={() => {
          sessionStorage.setItem("slos_auth", "1");
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <VerticalBanner />
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
