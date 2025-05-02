import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Terms() {
  const [location, navigate] = useLocation();
  
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate("/")}
      >
        &larr; Back to Home
      </Button>
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <h1>Terms of Service</h1>
        
        <p>Welcome to XPlayHD. By accessing or using our services, you agree to comply with and be bound by the following terms and conditions.</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using XPlayHD, you confirm that you are at least 18 years old and that you have read, understood, and agree to be bound by these Terms of Service.</p>
        
        <h2>2. User Content</h2>
        <p>When you upload, submit, or otherwise make available any content on XPlayHD, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, distribute, and display such content in connection with the services provided by XPlayHD.</p>
        
        <h2>3. Content Restrictions</h2>
        <p>You agree not to upload, submit, or otherwise make available any content that:</p>
        <ul>
          <li>Is illegal or promotes illegal activities</li>
          <li>Contains individuals under the age of 18</li>
          <li>Infringes on the rights of others, including copyright and trademark rights</li>
          <li>Contains non-consensual content</li>
          <li>Contains violence, bestiality, or other harmful content</li>
          <li>Contains individuals who have not provided consent to be filmed or have their content distributed</li>
        </ul>
        
        <h2>4. Account Responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
        
        <h2>5. Termination</h2>
        <p>We reserve the right to terminate or suspend your account and access to XPlayHD at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.</p>
        
        <h2>6. Disclaimer of Warranties</h2>
        <p>XPlayHD is provided "as is" and "as available" without any warranties of any kind, either express or implied.</p>
        
        <h2>7. Limitation of Liability</h2>
        <p>In no event shall XPlayHD be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.</p>
        
        <h2>8. Changes to Terms</h2>
        <p>We reserve the right to modify these Terms of Service at any time. Your continued use of XPlayHD after any such changes constitutes your acceptance of the new Terms of Service.</p>
        
        <h2>9. Governing Law</h2>
        <p>These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction in which XPlayHD operates, without regard to its conflict of law provisions.</p>
        
        <h2>10. Contact Information</h2>
        <p>If you have any questions about these Terms of Service, please contact us at legal@xplayhd.com.</p>
        
        <p className="text-muted-foreground mt-8">Last updated: May 1, 2025</p>
      </div>
    </div>
  );
}