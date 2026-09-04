import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard, useLogout } from "@/lib/hooks";
import type { Me } from "@/lib/types";

/** Top bar: current canon version + actor, logout. */
export function TopBar({ me }: { me: Me }) {
  const { data: dash } = useDashboard();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="h-12 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <span className="kicker text-muted-foreground">Canon Version</span>
        <span className="font-mono text-sm text-primary gold-glow font-semibold">
          {dash?.canon_version ?? "—"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          <span className="font-mono">{me.user}</span>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sign out?</span>
            <Button size="sm" variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
              Yes
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              No
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setConfirming(true)}>
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
