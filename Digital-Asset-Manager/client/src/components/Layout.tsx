import { Link, useLocation } from "wouter";
import { LayoutDashboard, PackagePlus, ArrowUpRight, Boxes, Menu, X, ShoppingCart, Sun, Moon, LogOut, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";

type AuthUser = { id: number; name: string; email: string; role: string };

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: user } = useCurrentUser() as { data: AuthUser | undefined };
  const logoutMutation = useLogout();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/purchase", label: "Purchase Request", icon: ShoppingCart },
    { href: "/receiving", label: "Receive Items", icon: PackagePlus },
    { href: "/issue", label: "Stock Out", icon: ArrowUpRight },
    { href: "/inventory", label: "Inventory", icon: Boxes },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-sm z-20">
        <div className="p-6 border-b border-border/50">
          <h1 className="text-xl font-bold tracking-tighter text-primary">
            INV.CONTROL
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Warehouse Management System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 cursor-pointer min-h-[48px]",
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover-elevate"
                )}
                data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
              >
                <item.icon className={cn("w-5 h-5", location === item.href && "text-primary")} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 space-y-3 border-t border-border/50">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate" data-testid="text-current-user">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.role}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="min-h-[48px] min-w-[48px]"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="min-h-[48px] min-w-[48px] text-muted-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          <div className="bg-secondary/50 rounded-md p-3">
            <p className="text-xs text-muted-foreground font-mono">SYSTEM STATUS</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium">Online</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between gap-4 p-4 border-b border-border bg-card/90 backdrop-blur z-30">
          <div className="font-bold text-lg text-primary">
            INV.CONTROL
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="min-h-[48px] min-w-[48px]"
              data-testid="button-theme-toggle-mobile"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-[48px] min-w-[48px]"
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in slide-in-from-top-10 duration-200">
            <div className="flex justify-end mb-8">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="min-h-[48px] min-w-[48px]">
                <X className="w-8 h-8 text-muted-foreground" />
              </Button>
            </div>
            <nav className="space-y-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 text-xl font-medium p-4 rounded-md border border-transparent transition-all min-h-[56px]",
                      location === item.href
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "text-muted-foreground hover-elevate"
                    )}
                    data-testid={`mobile-nav-${item.href.replace('/', '') || 'dashboard'}`}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-border">
              {user && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logoutMutation.mutate()}
                    className="min-h-[48px] min-w-[48px]"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
