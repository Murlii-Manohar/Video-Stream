import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Age Verification Required</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-red-500">
              <path d="M12 9v4"></path>
              <path d="M12 16h.01"></path>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
            </svg>
            <p className="text-lg font-semibold">Adult Content Warning</p>
          </div>
          <p className="mb-4">
            This website contains adult content that is only suitable for individuals 
            who are at least 18 years of age or the age of majority in your jurisdiction, 
            whichever is greater.
          </p>
          <p className="mb-6 font-medium">
            By clicking "I am 18 or older", you confirm that you are at least 18 years old 
            and are legally allowed to view adult content in your location.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
          <Button variant="default" size="lg" className="w-full sm:w-auto" onClick={handleVerify}>
            I am 18 or older - Enter Site
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={handleReject}>
            I am under 18 - Exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}