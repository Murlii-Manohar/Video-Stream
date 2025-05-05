import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function ContentPolicy() {
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
        <h1>Content Policy</h1>
        
        <p>PornVilla is committed to providing a platform for adult content that respects the rights and dignity of all individuals. This Content Policy outlines the types of content that are prohibited on our platform.</p>

        <h2>1. Age Requirements</h2>
        <p>All individuals appearing in content uploaded to PornVilla must be over the age of 18 at the time the content was created. Content creators are required to verify the age of all participants and maintain appropriate records.</p>
        
        <h2>2. Consent</h2>
        <p>All individuals appearing in content must have provided explicit consent for:</p>
        <ul>
          <li>Their participation in the creation of the content</li>
          <li>The distribution of the content on our platform</li>
          <li>Any specific acts performed in the content</li>
        </ul>
        <p>Content creators must obtain and maintain records of this consent.</p>
        
        <h2>3. Prohibited Content</h2>
        <p>The following types of content are strictly prohibited on PornVilla:</p>
        <ul>
          <li>Content featuring individuals under the age of 18</li>
          <li>Non-consensual content, including any form of sexual assault or coercion</li>
          <li>Content obtained without the knowledge or consent of the individuals depicted</li>
          <li>Content depicting extreme violence, abuse, or harm</li>
          <li>Content involving animals</li>
          <li>Content that promotes illegal activities</li>
          <li>Content that infringes on copyrights or other intellectual property rights</li>
          <li>Content that depicts or imitates children or minors in any way</li>
          <li>Content involving weapons or extreme physical harm</li>
          <li>Content featuring individuals who are intoxicated to the point of being unable to provide consent</li>
        </ul>
        
        <h2>4. Content Review Process</h2>
        <p>All content uploaded to PornVilla is subject to review to ensure compliance with this policy. We may:</p>
        <ul>
          <li>Review content before it is published</li>
          <li>Remove content that violates our policies</li>
          <li>Suspend or terminate accounts that repeatedly violate our policies</li>
          <li>Report illegal content to relevant authorities</li>
        </ul>
        
        <h2>5. Copyright and Intellectual Property</h2>
        <p>You must own all rights to the content you upload or have explicit permission from the copyright holder. PornVilla respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA).</p>
        
        <h2>6. Model Releases</h2>
        <p>Content creators are responsible for obtaining appropriate model releases from all individuals appearing in their content. These releases should grant permission for the content to be distributed on platforms like PornVilla.</p>
        
        <h2>7. Reporting Violations</h2>
        <p>If you believe content on XPlayHD violates this policy, please report it immediately. We take all reports seriously and will investigate promptly.</p>
        
        <h2>8. Compliance with Laws</h2>
        <p>All content must comply with applicable local, state, national, and international laws. Content creators are responsible for understanding and adhering to the laws that apply to them.</p>
        
        <h2>9. Changes to This Policy</h2>
        <p>We may update this Content Policy from time to time. We will notify users of any significant changes.</p>
        
        <h2>10. Contact Information</h2>
        <p>For questions about this Content Policy, please contact us at content-policy@xplayhd.com.</p>
        
        <p className="text-muted-foreground mt-8">Last updated: May 1, 2025</p>
      </div>
    </div>
  );
}