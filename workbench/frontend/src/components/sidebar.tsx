import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home, Upload, ScanSearch, Microscope, Target, Compass, Network,
  Landmark, PackageOpen, Activity,
} from "lucide-react";
import { useDashboard } from "@/lib/hooks";
import type { Me } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: Home, match: (l: string) => l === "/" },
  { href: "/intake", label: "Intake", icon: Upload, match: (l: string) => l.startsWith("/intake") },
  { href: "/review", label: "Review", icon: ScanSearch, match: (l: string) => l.startsWith("/review") },
  { href: "/evidence", label: "Evidence", icon: Microscope, match: (l: string) => l.startsWith("/evidence") },
  { href: "/predictions", label: "Predictions", icon: Target, match: (l: string) => l.startsWith("/predictions") },
  { href: "/discovery", label: "Discovery", icon: Compass, match: (l: string) => l.startsWith("/discovery") },
  { href: "/graph", label: "Graph", icon: Network, match: (l: string) => l.startsWith("/graph") },
  { href: "/canon", label: "Canon & Rulings", icon: Landmark, match: (l: string) => l.startsWith("/canon") },
  { href: "/exports", label: "Exports", icon: PackageOpen, match: (l: string) => l.startsWith("/exports") },
];

export function Sidebar({ me }: { me: Me }) {
  const [location] = useLocation();
  const { data: dash } = useDashboard();

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar h-screen flex flex-col fixed left-0 top-0 z-10 overflow-hidden">
      <div className="p-6 border-b border-sidebar-border shrink-0">
        <Link href="/">
          <div className="group cursor-pointer">
            <h1 className="font-display font-bold text-xl tracking-widest text-primary transition-opacity group-hover:opacity-80 gold-glow">
              Canonization
            </h1>
            <div className="h-0.5 w-12 bg-primary mt-2 mb-2 group-hover:w-full transition-all duration-500"></div>
            <p className="kicker text-muted-foreground">Governed Workbench</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 scrollbar-thin">
        <div className="px-6 mb-3 kicker font-bold text-primary/50">Workbench</div>
        <nav className="space-y-1 px-4">
          {NAV.map((item) => {
            const isActive = item.match(location);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-serif font-medium rounded-sm cursor-pointer transition-all duration-300 group",
                    isActive
                      ? "text-primary bg-primary/10 border-l-2 border-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-white/5 hover:pl-5 border-l-2 border-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <span className="tracking-wide">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-5 border-t border-sidebar-border shrink-0 bg-background/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
          <span className="text-xs font-serif text-primary tracking-widest uppercase">Canon Online</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground opacity-70">
          <Activity className="w-3 h-3" />
          <span>v{dash?.canon_version ?? "—"}</span>
          <span className="opacity-50">·</span>
          <span>{me.user}</span>
          <span className="opacity-50">·</span>
          <span>PG {me.postgres_version ?? "?"}</span>
        </div>
      </div>
    </div>
  );
}
