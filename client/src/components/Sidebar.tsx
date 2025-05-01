import React from "react";
import { Link, useLocation } from "wouter";
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

  return (
    <aside 
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-all duration-300 z-40",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <nav className="p-4">
        <div className="mb-6">
          <h3 className="font-medium text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">Main</h3>
          <ul className="space-y-1">
            <li>
              <Link href="/">
                <a className={cn(
                  "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                  location === "/" && "bg-gray-100 dark:bg-gray-800"
                )}>
                  <HomeIcon className="mr-3 h-5 w-5" />
                  <span>Home</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/quickies">
                <a className={cn(
                  "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                  location === "/quickies" && "bg-gray-100 dark:bg-gray-800"
                )}>
                  <ZapIcon className="mr-3 h-5 w-5" />
                  <span>Quickies</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/explore">
                <a className={cn(
                  "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                  location === "/explore" && "bg-gray-100 dark:bg-gray-800"
                )}>
                  <CompassIcon className="mr-3 h-5 w-5" />
                  <span>Explore</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/history">
                <a className={cn(
                  "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                  location === "/history" && "bg-gray-100 dark:bg-gray-800"
                )}>
                  <ClockIcon className="mr-3 h-5 w-5" />
                  <span>History</span>
                </a>
              </Link>
            </li>
          </ul>
        </div>
        
        {user && (
          <div className="mb-6">
            <h3 className="font-medium text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">Your Account</h3>
            <ul className="space-y-1">
              <li>
                <Link href={`/channel/${user.id}`}>
                  <a className={cn(
                    "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                    location === `/channel/${user.id}` && "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <UserIcon className="mr-3 h-5 w-5" />
                    <span>Your Channel</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/dashboard">
                  <a className={cn(
                    "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                    location === "/dashboard" && "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <LayoutDashboardIcon className="mr-3 h-5 w-5" />
                    <span>Dashboard</span>
                  </a>
                </Link>
              </li>
              <li>
                <div className={cn(
                  "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                  location === "/channel-dashboard" && "bg-gray-100 dark:bg-gray-800"
                )} onClick={() => navigate("/channel-dashboard")}>
                  <LayoutDashboardIcon className="mr-3 h-5 w-5" />
                  <span>Channel Dashboard</span>
                </div>
              </li>
              <li>
                <Link href="/liked">
                  <a className={cn(
                    "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                    location === "/liked" && "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <HeartIcon className="mr-3 h-5 w-5" />
                    <span>Liked Videos</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/bookmarks">
                  <a className={cn(
                    "flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                    location === "/bookmarks" && "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <BookmarkIcon className="mr-3 h-5 w-5" />
                    <span>Bookmarks</span>
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="font-medium text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">Categories</h3>
          <ul className="space-y-1">
            <li>
              <Link href="/category/amateur">
                <a className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Amateur</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/category/professional">
                <a className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Professional</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/category/verified">
                <a className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Verified Models</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/category/trending">
                <a className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Trending</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/category/most-viewed">
                <a className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Most Viewed</span>
                </a>
              </Link>
            </li>
          </ul>
        </div>
        
        {user && subscriptions && subscriptions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">Subscriptions</h3>
            <ul className="space-y-2">
              {subscriptions.map((sub: any) => (
                <li key={sub.id}>
                  <Link href={`/channel/${sub.channel.owner.id}`}>
                    <a className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <div className="relative w-7 h-7 rounded-full overflow-hidden mr-3">
                        <img 
                          src={sub.channel.owner.profileImage || 'https://via.placeholder.com/50'} 
                          alt={sub.channel.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span>{sub.channel.owner.displayName || sub.channel.owner.username}</span>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>© 2023 XPlayHD</p>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <Link href="/terms">
                <a className="hover:underline">Terms</a>
              </Link>
              <Link href="/privacy">
                <a className="hover:underline">Privacy</a>
              </Link>
              <Link href="/content-policy">
                <a className="hover:underline">Content Policy</a>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
