import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Package, KeyRound, Tag, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-60 border-r bg-background p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-4 mb-2">
          <Tag className="h-6 w-6 text-primary" />
          <span className="font-semibold">Etiquetas Pro</span>
        </div>
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
