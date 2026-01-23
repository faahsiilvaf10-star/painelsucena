import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ForbiddenColorIndicator from "@/components/ForbiddenColorIndicator";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          {/* Mobile header with trigger */}
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="font-semibold">Painel Sucena</span>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <ForbiddenColorIndicator />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
