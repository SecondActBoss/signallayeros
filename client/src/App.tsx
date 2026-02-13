import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { VerticalBanner } from "@/components/vertical-banner";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Signals from "@/pages/signals";
import Leads from "@/pages/leads";
import Content from "@/pages/content";
import Ingest from "@/pages/ingest";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/signals" component={Signals} />
      <Route path="/leads" component={Leads} />
      <Route path="/content" component={Content} />
      <Route path="/ingest" component={Ingest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

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
