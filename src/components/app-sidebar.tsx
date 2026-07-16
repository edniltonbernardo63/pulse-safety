import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarClock,
  HardHat,
  Building2,
  BookOpen,
  Calendar,
  FileBadge,
  FileText,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.png";

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Colaboradores", url: "/colaboradores", icon: Users },
  { title: "Treinamentos", url: "/treinamentos", icon: GraduationCap },
  { title: "Vencimentos", url: "/vencimentos", icon: CalendarClock },
  { title: "EPIs", url: "/epis", icon: HardHat },
  { title: "Certificados", url: "/certificados", icon: FileBadge },
  { title: "Fornecedores", url: "/fornecedores", icon: Building2 },
  { title: "Normas (NRs)", url: "/nrs", icon: BookOpen },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={logo} alt="TEC - SST" className="h-8 w-8 shrink-0" width={32} height={32} />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-bold text-sm leading-tight">TEC - SST</div>
            <div className="text-[10px] text-sidebar-foreground/60 leading-tight">Gestão de SST</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
