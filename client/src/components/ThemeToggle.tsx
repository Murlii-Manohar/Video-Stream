import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 overflow-hidden"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <span className="flex h-4 w-4 items-center justify-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1 3.25C1 3.11193 1.11193 3 1.25 3H13.75C13.8881 3 14 3.11193 14 3.25V10.75C14 10.8881 13.8881 11 13.75 11H1.25C1.11193 11 1 10.8881 1 10.75V3.25ZM1.25 2C0.559644 2 0 2.55964 0 3.25V10.75C0 11.4404 0.559644 12 1.25 12H13.75C14.4404 12 15 11.4404 15 10.75V3.25C15 2.55964 14.4404 2 13.75 2H1.25Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              <path d="M7.5 8.5C7.5 8.22386 7.72386 8 8 8H12C12.2761 8 12.5 8.22386 12.5 8.5C12.5 8.77614 12.2761 9 12 9H8C7.72386 9 7.5 8.77614 7.5 8.5Z" fill="currentColor"></path>
              <path d="M7.5 10.5C7.5 10.2239 7.72386 10 8 10H12C12.2761 10 12.5 10.2239 12.5 10.5C12.5 10.7761 12.2761 11 12 11H8C7.72386 11 7.5 10.7761 7.5 10.5Z" fill="currentColor"></path>
              <path d="M7.5 6.5C7.5 6.22386 7.72386 6 8 6H12C12.2761 6 12.5 6.22386 12.5 6.5C12.5 6.77614 12.2761 7 12 7H8C7.72386 7 7.5 6.77614 7.5 6.5Z" fill="currentColor"></path>
              <path d="M2.5 6.5C2.5 6.22386 2.72386 6 3 6H5C5.27614 6 5.5 6.22386 5.5 6.5C5.5 6.77614 5.27614 7 5 7H3C2.72386 7 2.5 6.77614 2.5 6.5Z" fill="currentColor"></path>
              <path d="M2.5 8.5C2.5 8.22386 2.72386 8 3 8H5C5.27614 8 5.5 8.22386 5.5 8.5C5.5 8.77614 5.27614 9 5 9H3C2.72386 9 2.5 8.77614 2.5 8.5Z" fill="currentColor"></path>
              <path d="M2.5 10.5C2.5 10.2239 2.72386 10 3 10H5C5.27614 10 5.5 10.2239 5.5 10.5C5.5 10.7761 5.27614 11 5 11H3C2.72386 11 2.5 10.7761 2.5 10.5Z" fill="currentColor"></path>
              <path d="M5.5 2.5C5.5 2.22386 5.72386 2 6 2H9C9.27614 2 9.5 2.22386 9.5 2.5C9.5 2.77614 9.27614 3 9 3H6C5.72386 3 5.5 2.77614 5.5 2.5Z" fill="currentColor"></path>
              <path d="M6 13C5.72386 13 5.5 13.2239 5.5 13.5C5.5 13.7761 5.72386 14 6 14H9C9.27614 14 9.5 13.7761 9.5 13.5C9.5 13.2239 9.27614 13 9 13H6Z" fill="currentColor"></path>
            </svg>
          </span>
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}