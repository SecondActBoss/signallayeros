import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Radio,
  Users,
  FileText,
  Upload,
  Layers,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Command Center",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Pain Signals",
    url: "/signals",
    icon: Radio,
  },
  {
    title: "Operator Targets",
    url: "/leads",
    icon: Users,
  },
  {
    title: "Content",
    url: "/content",
    icon: FileText,
  },
  {
    title: "Ingest",
    url: "/ingest",
    icon: Upload,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
            <Layers className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              SignalLayerOS
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              GTM Intelligence
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="transition-colors"
                    >
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/40">
          AgentLayerOS Internal
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
