import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryFilterProps) {
  return (
    <div className="w-full bg-white dark:bg-black sticky top-16 z-10 border-b border-gray-200 dark:border-gray-800 py-3">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 px-4">
          <Button
            variant={selectedCategory === null ? "default" : "outline"} 
            size="sm"
            onClick={() => onSelectCategory(null)}
            className="rounded-full"
          >
            All
          </Button>
          
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(category)}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}