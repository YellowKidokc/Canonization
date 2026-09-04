import { Route, Switch } from "wouter";
import { useMe } from "@/lib/hooks";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Loading } from "@/components/common";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Intake from "@/pages/intake";
import Review from "@/pages/review";
import Evidence from "@/pages/evidence";
import Predictions from "@/pages/predictions";
import Discovery from "@/pages/discovery";
import GraphPage from "@/pages/graph";
import Canon from "@/pages/canon";
import Exports from "@/pages/exports";

export default function App() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Contacting the canon…" />
      </div>
    );
  }

  // 401 from /api/me → login screen (or any other fatal fetch error).
  if (me.isError || !me.data) {
    return <Login />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar me={me.data} />
        <div className="pl-64 flex flex-col min-h-screen">
          <TopBar me={me.data} />
          <main className="flex-1 p-6 lg:p-8">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/intake" component={Intake} />
              <Route path="/review/:sourceId?" component={Review} />
              <Route path="/evidence" component={Evidence} />
              <Route path="/predictions" component={Predictions} />
              <Route path="/discovery" component={Discovery} />
              <Route path="/graph" component={GraphPage} />
              <Route path="/canon" component={Canon} />
              <Route path="/exports" component={Exports} />
              <Route>
                <div className="text-center py-24 text-muted-foreground font-display">
                  Not found in the canon.
                </div>
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
