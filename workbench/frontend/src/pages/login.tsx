import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { ShieldCheck } from "lucide-react";

export default function Login() {
  const [password, setPassword] = useState("");
  const login = useLogin();

  const err = login.error instanceof ApiError ? login.error.detail : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) login.mutate(password.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-border bg-card p-8 rounded-lg shadow animate-in fade-in slide-in-from-bottom-8 duration-500"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-xl tracking-widest text-primary gold-glow">Canonization</h1>
        </div>
        <p className="kicker text-muted-foreground mb-6">Governed Workbench — Sign In</p>

        <Input
          type="password"
          placeholder="Session password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="mb-4 font-mono"
        />

        {err && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-mono mb-4">
            {err}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!password.trim() || login.isPending}>
          {login.isPending ? "Signing in…" : "Sign In"}
        </Button>

        <p className="text-[10px] font-mono text-muted-foreground/60 mt-4 text-center">
          Every status change requires an authenticated human ruling.
        </p>
      </form>
    </div>
  );
}
