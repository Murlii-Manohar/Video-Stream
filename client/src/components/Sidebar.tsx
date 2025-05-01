import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { 
  HomeIcon, 
  ZapIcon, 
  CompassIcon, 
  ClockIcon,
  UserIcon,
  LayoutDashboardIcon,
  HeartIcon,
  BookmarkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Fetch user subscriptions if logged in
  const { data: subscriptions } = useQuery({
    queryKey: user ? ['/api/users', user.id, 'subscriptions'] : null,
    enabled: !!user,
  });

  // Helper function for navigation items
  const NavItem = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
    <li>
      <div 
        className={cn(
          "flex items-center px-4 py-2 rounded-lg hover:bg-muted cursor-pointer",
          location === href && "bg-muted"
        )}
        onClick={() => navigate(href)}
      >
        {icon}
        <span>{label}</span>
      </div>
    </li>
  );

  return (
    <aside 
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-background border-r border-border overflow-y-auto transition-all duration-300 z-40",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <nav className="p-4">
        <div className="mb-6">
          <h3 className="font-medium text-sm uppercase text-muted-foreground mb-2">Main</h3>
          <ul className="space-y-1">
            <NavItem 
              href="/" 
              icon={<HomeIcon className="mr-3 h-5 w-5" />} 
              label="Home" 
            />
            <NavItem 
              href="/quickies" 
              icon={<ZapIcon className="mr-3 h-5 w-5" />} 
              label="Quickies" 
            />
            <NavItem 
              href="/explore" 
              icon={<CompassIcon className="mr-3 h-5 w-5" />} 
              label="Explore" 
            />
            <NavItem 
              href="/history" 
              icon={<ClockIcon className="mr-3 h-5 w-5" />} 
              label="History" 
            />
          </ul>
        </div>
        
        {user && (
          <div className="mb-6">
            <h3 className="font-medium text-sm uppercase text-muted-foreground mb-2">Your Account</h3>
            <ul className="space-y-1">
              <NavItem 
                href={`/channel/${user.id}`} 
                icon={<UserIcon className="mr-3 h-5 w-5" />} 
                label="Your Channel" 
              />
              <NavItem 
                href="/dashboard" 
                icon={<LayoutDashboardIcon className="mr-3 h-5 w-5" />} 
                label="Dashboard" 
              />
              <NavItem 
                href="/channel-dashboard" 
                icon={<LayoutDashboardIcon className="mr-3 h-5 w-5" />} 
                label="Channel Dashboard" 
              />
              <NavItem 
                href="/liked" 
                icon={<HeartIcon className="mr-3 h-5 w-5" />} 
                label="Liked Videos" 
              />
              <NavItem 
                href="/bookmarks" 
                icon={<BookmarkIcon className="mr-3 h-5 w-5" />} 
                label="Bookmarks" 
              />
            </ul>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="font-medium text-sm uppercase text-muted-foreground mb-2">Categories</h3>
          <ul className="space-y-1">
            {["Amateur", "Professional", "Verified Models", "Trending", "Most Viewed"].map((category) => {
              const slug = category.toLowerCase().replace(/\s+/g, '-');
              return (
                <li key={slug}>
                  <div 
                    className="flex items-center px-4 py-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => navigate(`/category/${slug}`)}
                  >
                    <span>{category}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        
        {user && subscriptions && Array.isArray(subscriptions) && subscriptions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-sm uppercase text-muted-foreground mb-2">Subscriptions</h3>
            <ul className="space-y-2">
              {subscriptions.map((sub: any) => (
                <li key={sub.id}>
                  <div 
                    className="flex items-center px-4 py-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => navigate(`/channel/${sub.channel?.owner?.id}`)}
                  >
                    <div className="relative w-7 h-7 rounded-full overflow-hidden mr-3">
                      <img 
                        src={sub.channel?.owner?.profileImage || 'https://via.placeholder.com/50'} 
                        alt={sub.channel?.name || 'Channel'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span>{sub.channel?.owner?.displayName || sub.channel?.owner?.username || 'Unknown'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>© 2023 XPlayHD</p>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <div className="hover:underline cursor-pointer" onClick={() => navigate("/terms")}>Terms</div>
              <div className="hover:underline cursor-pointer" onClick={() => navigate("/privacy")}>Privacy</div>
              <div className="hover:underline cursor-pointer" onClick={() => navigate("/content-policy")}>Content Policy</div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
