import nodemailer from 'nodemailer';

// Configure email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || ''
  }
});

// Email service functions
export const emailService = {
  // Send contact form email
  async sendContactEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<boolean> {
    try {
      // Email template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">PornVilla Contact Form Submission</h2>
          <p><strong>From:</strong> ${data.name} (${data.email})</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p><strong>Message:</strong></p>
            <p>${data.message.replace(/\n/g, '<br>')}</p>
          </div>
          <hr style="margin-top: 20px; margin-bottom: 20px; border: 0; border-top: 1px solid #eee;" />
          <p style="color: #777; font-size: 12px;">This email was sent from the PornVilla contact form.</p>
        </div>
      `;

      // Send email
      const info = await transporter.sendMail({
        from: `"PornVilla Contact" <${process.env.EMAIL_USER}>`,
        to: 'jsins8061@gmail.com',
        subject: `[PornVilla Contact] ${data.subject}`,
        html: htmlContent,
        // Add reply-to so you can directly reply to the sender
        replyTo: data.email
      });

      console.log(`[emailService] Contact email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[emailService] Error sending contact email:', error);
      return false;
    }
  },

  // Send verification email
  async sendVerificationEmail(email: string, verificationCode: string): Promise<boolean> {
    try {
      // Email template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">Verify Your Email Address</h2>
          <p>Thank you for signing up for PornVilla. To complete your registration, please use the verification code below:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
            <h3 style="font-size: 24px; letter-spacing: 5px;">${verificationCode}</h3>
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <hr style="margin-top: 20px; margin-bottom: 20px; border: 0; border-top: 1px solid #eee;" />
          <p style="color: #777; font-size: 12px;">This email was sent from PornVilla.</p>
        </div>
      `;

      // Send email
      const info = await transporter.sendMail({
        from: `"PornVilla" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: htmlContent
      });

      console.log(`[emailService] Verification email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[emailService] Error sending verification email:', error);
      return false;
    }
  }
};