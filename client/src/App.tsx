import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { cn } from "@/lib/utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { AgeVerification } from "@/components/AgeVerification";
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
import Contact from "@/pages/Contact";
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
  // Default to closed on mobile, open on desktop
  const isDesktop = window.innerWidth >= 768;
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  
  const toggleSidebar = () => {
    console.log('Toggling sidebar from', sidebarOpen, 'to', !sidebarOpen);
    setSidebarOpen(prevState => !prevState);
  };
  
  // Add an overlay when sidebar is open on mobile
  const Overlay = () => (
    <div 
      className={`fixed inset-0 bg-black/50 z-30 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
      onClick={toggleSidebar}
    />
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      <Header toggleSidebar={toggleSidebar} />
      <Overlay />
      <div className="flex relative">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 w-full transition-all duration-300 min-h-[calc(100vh-64px)] md:ml-64">
          <div className="p-2 sm:p-4 md:p-6">
            <Switch>
              {/* Main navigation */}
              <Route path="/" component={Home} />
              <Route path="/watch/:id" component={Watch} />
              <Route path="/quickies" component={Quickies} />
              <Route path="/explore" component={Explore} />
              <Route path="/history" component={History} />
              
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
              <Route path="/contact" component={Contact} />
              
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </div>
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
            <AgeVerification />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
