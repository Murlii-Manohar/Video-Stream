import nodemailer from 'nodemailer';

// Email verification codes storage
// In a production app, this would be stored in a database
const verificationCodes: Map<string, { code: string, expires: Date }> = new Map();

// Configure nodemailer with Gmail
let transporter: nodemailer.Transporter;

export const initializeEmailService = () => {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Generate a random 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email: string): Promise<string> => {
  if (!transporter) {
    throw new Error('Email service not initialized');
  }

  const code = generateVerificationCode();
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 30); // Code expires in 30 minutes
  
  // Store the code
  verificationCodes.set(email, { code, expires });
  
  // Configure email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'XPlayHD - Email Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #e53e3e;">XPlayHD - Email Verification</h2>
        <p>Thank you for registering with XPlayHD. Please use the following code to verify your email address:</p>
        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
          <strong>${code}</strong>
        </div>
        <p>This code will expire in 30 minutes.</p>
        <p>If you did not request this verification, please ignore this email.</p>
        <p>Best regards,<br>The XPlayHD Team</p>
      </div>
    `
  };
  
  // Send the email
  await transporter.sendMail(mailOptions);
  
  return code;
};

// Verify the code
export const verifyCode = (email: string, code: string): boolean => {
  const storedData = verificationCodes.get(email);
  
  if (!storedData) {
    return false;
  }
  
  if (new Date() > storedData.expires) {
    // Code has expired, remove it
    verificationCodes.delete(email);
    return false;
  }
  
  if (storedData.code !== code) {
    return false;
  }
  
  // Code is valid, remove it after use
  verificationCodes.delete(email);
  return true;
};