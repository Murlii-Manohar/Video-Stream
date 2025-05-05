import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Baby, Tv, School, GamepadIcon, Cake } from "lucide-react";

export default function KidsZone() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-600 mb-4">
          Woah There, Little One!
        </h1>
        
        <div className="w-full max-w-md mx-auto mb-8">
          <img 
            src="https://i.imgur.com/YFtZ9hc.png" 
            alt="Cartoon baby" 
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
        
        <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-blue-300">
          <CardContent className="pt-6 text-lg font-medium text-center">
            <p className="mb-4 text-xl font-bold text-red-500">
              This site is for grown-ups only!
            </p>
            <p className="mb-3 text-gray-700">
              Go drink your mama's milk and come back when you're older! 🍼
            </p>
            <p className="mb-3 text-gray-700">
              Maybe try watching Pogo or Cartoon Network instead?
            </p>
          </CardContent>
        </Card>
        
        <h2 className="text-2xl font-bold text-purple-600 mb-6">
          Here's what you can do instead:
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FunSuggestion 
            icon={<Baby className="h-10 w-10 text-pink-500" />}
            title="Take a nap"
            description="You seem tired. Maybe it's nap time!"
          />
          
          <FunSuggestion 
            icon={<Tv className="h-10 w-10 text-blue-500" />}
            title="Watch cartoons"
            description="Tom & Jerry is on right now!"
          />
          
          <FunSuggestion 
            icon={<School className="h-10 w-10 text-yellow-600" />}
            title="Do your homework"
            description="Your teacher is waiting for it!"
          />
          
          <FunSuggestion 
            icon={<GamepadIcon className="h-10 w-10 text-green-500" />}
            title="Play games"
            description="Try Minecraft or Roblox instead"
          />
        </div>
        
        <div className="flex justify-center space-x-4">
          <a href="https://www.cartoonnetwork.com" target="_blank" rel="noreferrer">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600">
              Go to Cartoon Network
            </Button>
          </a>
          
          <a href="https://www.nick.com" target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-100">
              Visit Nickelodeon
            </Button>
          </a>
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          P.S. Come back in {18 - (new Date().getFullYear() - 2010)} years when you're all grown up! 🎂
        </p>
      </div>
    </div>
  );
}

// Fun suggestion component
function FunSuggestion({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) {
  return (
    <Card className="bg-white/80 backdrop-blur border-2 border-purple-200 hover:border-purple-300 transition-all">
      <CardContent className="p-4 flex items-center space-x-4">
        <div className="shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-lg text-purple-700">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}