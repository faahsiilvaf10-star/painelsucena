import { Users, ClipboardList, Grid3X3, LayoutDashboard, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "RH", path: "/rh" },
  { icon: ClipboardList, label: "Presença", path: "/presenca" },
  { icon: Grid3X3, label: "Matriz RACI", path: "/matriz" },
];

const Header = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/95 to-transparent">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background border-r border-border">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">O</span>
                  </div>
                  <span className="text-2xl font-bold tracking-tight">OpsHub</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium text-base">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <Separator className="my-4" />
              <div className="px-4">
                <ThemeToggle showLabel className="w-full justify-start" />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">O</span>
            </div>
            <span className="text-2xl font-bold tracking-tight hidden sm:inline">OpsHub</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle & User Avatar */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden md:flex" />
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-semibold">AD</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
