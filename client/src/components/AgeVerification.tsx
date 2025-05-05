import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AgeVerification() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has already verified age
    const hasVerifiedAge = localStorage.getItem("age-verified") === "true";
    if (!hasVerifiedAge) {
      setOpen(true);
    }
  }, []);

  const handleVerify = () => {
    // Store verification in localStorage
    localStorage.setItem("age-verified", "true");
    setOpen(false);
  };

  const handleReject = () => {
    // Redirect to YouTube
    window.location.href = "https://www.youtube.com/channel/UCbCmjCuTUZos6Inko4u57UQ";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="max-w-md mx-auto p-6" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 mb-4">
          <DialogTitle className="text-xl font-bold text-center">Age Verification Required</DialogTitle>
          <DialogDescription className="sr-only">Please verify your age to continue</DialogDescription>
        </DialogHeader>
        
        <div className="text-center">
          <div className="mb-6">
            <div className="bg-red-500 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4"></path>
                <path d="M12 16h.01"></path>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
              </svg>
            </div>
            <p className="text-lg font-semibold">Adult Content Warning</p>
          </div>
          
          <p className="mb-4 text-sm sm:text-base">
            This website contains adult content that is only suitable for individuals 
            who are at least 18 years of age or the age of majority in your jurisdiction, 
            whichever is greater.
          </p>
          
          <p className="mb-6 font-medium text-sm sm:text-base">
            By clicking "I am 18 or older", you confirm that you are at least 18 years old 
            and are legally allowed to view adult content in your location.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <Button 
            variant="default" 
            size="lg" 
            className="bg-red-500 hover:bg-red-600 text-white py-3" 
            onClick={handleVerify}
          >
            I am 18 or older - Enter Site
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="border-red-500 text-red-500 hover:bg-red-50 py-3" 
            onClick={handleReject}
          >
            I am under 18 - Exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}