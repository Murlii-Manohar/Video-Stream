import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  MenuIcon, 
  UploadIcon, 
  SearchIcon, 
  LogInIcon,
  UserIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from "lucide-react";
import LoginForm from "./LoginForm";
import UploadForm from "./UploadForm";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleUploadClick = () => {
    if (user) {
      setShowUploadModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left section: Logo and sidebar toggle */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 rounded-full hover:bg-muted"
            onClick={() => {
              console.log('Menu button clicked');
              toggleSidebar();
            }}
            type="button"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          
          {/* Navigation buttons */}
          <div className="flex items-center mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted"
              onClick={() => window.history.back()}
              title="Go Back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted"
              onClick={() => window.history.forward()}
              title="Go Forward"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </Button>
          </div>
          
          <Link href="/" className="flex items-center">
            <span className="text-primary font-poppins text-2xl font-bold">XPlay<span className="text-secondary">HD</span></span>
          </Link>
        </div>
        
        {/* Middle section: Search bar */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Input
              type="text"
              placeholder="Search videos, channels, or categories"
              className="w-full h-10 pl-4 pr-10 rounded-full bg-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit"
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 h-full px-4"
            >
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </Button>
          </form>
        </div>
        
        {/* Right section: Theme toggle, upload, notifications, and profile */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          {/* Upload button */}
          <Button 
            variant="default" 
            className="hidden sm:flex items-center px-3 py-2 rounded-full bg-primary text-white font-medium hover:bg-opacity-90"
            onClick={handleUploadClick}
          >
            <UploadIcon className="mr-2 h-4 w-4" />
            <span>Upload</span>
          </Button>
          
          {/* Mobile only upload icon */}
          <Button
            variant="ghost"
            size="icon" 
            className="sm:hidden p-2 rounded-full hover:bg-muted"
            onClick={handleUploadClick}
          >
            <UploadIcon className="h-5 w-5" />
          </Button>
          
          {/* Login/Profile buttons */}
          {!user ? (
            <Button
              variant="outline" 
              className="flex items-center px-4 py-2 border border-primary text-primary rounded-full hover:bg-primary hover:text-white transition-colors"
              onClick={() => setShowLoginModal(true)}
            >
              <LogInIcon className="mr-2 h-4 w-4" />
              <span>Login</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full p-0" aria-label="User menu">
                    <Avatar className="w-9 h-9">
                      <AvatarImage 
                        src={user.profileImage || ""} 
                        alt={user.displayName || user.username}
                      />
                      <AvatarFallback className="bg-primary text-white">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocation(`/profile`)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/my-channels')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    My Channels
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/dashboard')}>
                    <LayoutDashboardIcon className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      
      {/* Login Modal */}
      <LoginForm open={showLoginModal} onOpenChange={setShowLoginModal} />
      
      {/* Upload Modal */}
      <UploadForm open={showUploadModal} onOpenChange={setShowUploadModal} />
    </header>
  );
}
