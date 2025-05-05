import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Privacy() {
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
        <h1>Privacy Policy</h1>
        
        <p>At PornVilla, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul>
          <li><strong>Account Information:</strong> When you create an account, we collect your email address, username, and password.</li>
          <li><strong>Profile Information:</strong> You may provide additional information such as profile pictures, bio, and display name.</li>
          <li><strong>Usage Data:</strong> We collect information about how you interact with our platform, including videos watched, search queries, and engagement metrics.</li>
          <li><strong>Content:</strong> If you upload videos or other content, we collect and store that information.</li>
          <li><strong>Technical Data:</strong> We collect information about your device, IP address, browser type, and operating system.</li>
        </ul>
        
        <h2>2. How We Use Your Information</h2>
        <p>We use your information for the following purposes:</p>
        <ul>
          <li>Providing and improving our services</li>
          <li>Personalizing your experience on the platform</li>
          <li>Processing payments and transactions</li>
          <li>Communicating with you about your account, updates, and new features</li>
          <li>Ensuring platform security and preventing fraud</li>
          <li>Analyzing usage patterns to improve the platform</li>
        </ul>
        
        <h2>3. Information Sharing</h2>
        <p>We do not sell your personal information to third parties. We may share your information in the following situations:</p>
        <ul>
          <li>With service providers who help us operate our platform</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights, privacy, safety, or property</li>
          <li>In connection with a business transfer or acquisition</li>
        </ul>
        
        <h2>4. Your Choices and Rights</h2>
        <p>You have the following rights regarding your personal information:</p>
        <ul>
          <li>Access or update your personal information through your account settings</li>
          <li>Request deletion of your account and associated data</li>
          <li>Opt-out of certain data collection or processing</li>
          <li>Request a copy of your data</li>
        </ul>
        
        <h2>5. Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
        
        <h2>6. Cookies and Similar Technologies</h2>
        <p>We use cookies and similar technologies to enhance your experience, collect usage information, and enable certain platform features. You can manage cookie preferences through your browser settings.</p>
        
        <h2>7. Children's Privacy</h2>
        <p>Our platform is intended for adults over the age of 18. We do not knowingly collect information from individuals under 18 years of age.</p>
        
        <h2>8. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
        
        <h2>9. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at privacy@pornvilla.com.</p>
        
        <p className="text-muted-foreground mt-8">Last updated: May 1, 2025</p>
      </div>
    </div>
  );
}