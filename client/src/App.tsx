import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Watch from "@/pages/Watch";
import Quickies from "@/pages/Quickies";
import MyChannel from "@/pages/MyChannel";
import Upload from "@/pages/Upload";
import AdminPanel from "@/pages/AdminPanel";
import { useAuth } from "@/context/AuthContext";

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user } = useAuth();
  
  if (!user) {
    return <Route {...rest} component={() => <NotFound />} />;
  }
  
  if (adminOnly && !user.isAdmin) {
    return <Route {...rest} component={() => <NotFound />} />;
  }
  
  return <Route {...rest} component={Component} />;
}

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 ml-0 md:ml-64 transition-all duration-300" style={sidebarOpen ? {} : { marginLeft: 0 }}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/watch/:id" component={Watch} />
            <Route path="/quickies" component={Quickies} />
            <ProtectedRoute path="/my-channel" component={MyChannel} />
            <Route path="/category/:categorySlug" component={Home} />
            <ProtectedRoute path="/upload" component={Upload} />
            <ProtectedRoute path="/admin" component={AdminPanel} adminOnly={true} />
            {/* Fallback to 404 */}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
