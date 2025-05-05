import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
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
import Explore from "@/pages/Explore";
import History from "@/pages/History";
import Liked from "@/pages/Liked";
import Bookmarks from "@/pages/Bookmarks";
import CategoryPage from "@/pages/CategoryPage";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import ContentPolicy from "@/pages/ContentPolicy";
import ProfilePage from "@/pages/ProfilePage";
import MyChannelsPage from "@/pages/MyChannelsPage";
import DashboardPage from "@/pages/DashboardPage";
import SettingsPage from "@/pages/SettingsPage";
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
            {/* Main navigation */}
            <Route path="/" component={Home} />
            <Route path="/watch/:id" component={Watch} />
            <Route path="/quickies" component={Quickies} />
            <Route path="/explore" component={Explore} />
            <ProtectedRoute path="/history" component={History} />
            
            {/* User account routes */}
            <ProtectedRoute path="/my-channel" component={MyChannel} />
            <ProtectedRoute path="/profile" component={ProfilePage} />
            <ProtectedRoute path="/my-channels" component={MyChannelsPage} />
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
            <ProtectedRoute path="/settings" component={SettingsPage} />
            <ProtectedRoute path="/liked" component={Liked} />
            <ProtectedRoute path="/bookmarks" component={Bookmarks} />
            <ProtectedRoute path="/upload" component={Upload} />
            <ProtectedRoute path="/admin" component={AdminPanel} adminOnly={true} />
            
            {/* Category pages */}
            <Route path="/category/:categorySlug" component={CategoryPage} />
            
            {/* Legal pages */}
            <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/content-policy" component={ContentPolicy} />
            
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
