import { MailService } from '@sendgrid/mail';

interface VerificationEmailData {
  email: string;
  firstName: string;
  verificationLink: string;
}

interface VerificationSuccessEmailData {
  email: string;
  firstName: string;
}

interface PasswordResetEmailData {
  email: string;
  firstName: string;
  resetLink: string;
}

class EmailService {
  private mailService: MailService | null;

  constructor() {
    // Use the environment variable for SendGrid API key
    const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
    if (!apiKey) {
      this.mailService = null;
      console.warn('📧 SendGrid disabled: missing SENDGRID_API_KEY. Emails will be skipped.');
      return;
    }

    this.mailService = new MailService();
    this.mailService.setApiKey(apiKey);
    console.log('📧 EmailService initialized with SendGrid');
  }

  private getAppBaseUrl(): string {
    const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5000';
    // Ensure no trailing slash and proper URL format
    return baseUrl.replace(/\/$/, '');
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping verification email: SendGrid not configured');
        return false;
      }

      const subject = 'Verify Your Email Address - Plato Applicant Tracker';
      const html = this.generateVerificationEmailHTML(data);
      const text = this.generateVerificationEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platoapp.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Applicant Tracker').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Verification email sent successfully to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid verification email error:', error);
      return false;
    }
  }

  async sendVerificationSuccessEmail(data: VerificationSuccessEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping verification success email: SendGrid not configured');
        return false;
      }

      const subject = 'Email Verified Successfully - Welcome to Plato Applicant Tracker!';
      const html = this.generateVerificationSuccessEmailHTML(data);
      const text = this.generateVerificationSuccessEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platoapp.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Applicant Tracker').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Verification success email sent to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid verification success email error:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping password reset email: SendGrid not configured');
        return false;
      }

      const subject = 'Reset Your Password - Plato Applicant Tracker';
      const html = this.generatePasswordResetEmailHTML(data);
      const text = this.generatePasswordResetEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platoapp.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Applicant Tracker').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Password reset email sent to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid password reset email error:', error);
      return false;
    }
  }

  private generateVerificationEmailHTML(data: VerificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email Address</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">✉️</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Verify Your Email</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Welcome to Plato Applicant Tracker!</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Hi ${data.firstName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Thanks for signing up for Plato Applicant Tracker.</p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; border: 2px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 12px 0;">Please verify your email address</h3>
            <p style="color: #374151; margin: 0; line-height: 1.6;">
              To complete your registration and access all features of Plato Applicant Tracker, please verify your email address by clicking the button below.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 Verify Your Email</h3>
              <p style="color: #d1fae5; margin: 0 0 24px 0; font-size: 16px;">Click below to verify your email and activate your account</p>
              <a href="${data.verificationLink}"
                 style="background: white; color: #059669; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                Verify Email Address
              </a>
            </div>

            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #92400e; margin: 0; font-weight: 600;">Important:</p>
              <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px;">This verification link will expire in 1 week for security reasons.</p>
            </div>

            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #10b981; font-size: 12px; margin: 8px 0 0 0;">
              ${data.verificationLink}
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              If you didn't create an account with Plato Applicant Tracker, you can safely ignore this email.
              The verification link will expire automatically.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The Plato Applicant Tracker Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateVerificationEmailText(data: VerificationEmailData): string {
    return `
✉️ VERIFY YOUR EMAIL ADDRESS - PLATO APPLICANT TRACKER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${data.firstName}!

Welcome to Plato Applicant Tracker! Thanks for signing up for our platform.

VERIFY YOUR EMAIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To complete your registration and access all features, please verify your email address by clicking the link below:

${data.verificationLink}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 CLICK THE LINK ABOVE TO VERIFY YOUR EMAIL

IMPORTANT: This verification link will expire in 1 week for security reasons.

If you didn't create an account with Plato Applicant Tracker, you can safely ignore this email. The verification link will expire automatically.

We're excited to have you join our platform!

Best regards,
The Plato Applicant Tracker Team
    `.trim();
  }

  private generateVerificationSuccessEmailHTML(data: VerificationSuccessEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified Successfully</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">✅</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Email Verified!</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Welcome to Plato Applicant Tracker</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Congratulations ${data.firstName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Your email address has been successfully verified.</p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; border: 2px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 12px 0;">🎉 What's Next?</h3>
            <p style="color: #374151; margin: 0; line-height: 1.6;">
              Your account is now active and ready to use! You can log in to Plato Applicant Tracker and start using all our features to streamline your hiring process.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 Get Started Now</h3>
              <a href="${this.getAppBaseUrl()}/signin"
                 style="background: white; color: #059669; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Login to Your Account
              </a>
            </div>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <h3 style="color: #374151; margin: 0 0 12px 0;">With Plato Applicant Tracker, you can:</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Track applicants through the entire hiring pipeline</li>
              <li>Manage job postings and applications efficiently</li>
              <li>Collaborate with your hiring team</li>
              <li>Schedule interviews and track candidate progress</li>
              <li>Make data-driven hiring decisions</li>
            </ul>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The Plato Applicant Tracker Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateVerificationSuccessEmailText(data: VerificationSuccessEmailData): string {
    return `
✅ EMAIL VERIFIED SUCCESSFULLY - PLATO APPLICANT TRACKER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Congratulations ${data.firstName}!

Your email address has been successfully verified and your account is now active.

🎉 WELCOME TO PLATO APPLICANT TRACKER!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can now log in and start using all our features:

• Track applicants through the entire hiring pipeline
• Manage job postings and applications efficiently
• Collaborate with your hiring team
• Schedule interviews and track candidate progress
• Make data-driven hiring decisions

GET STARTED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Login to your account now: ${this.getAppBaseUrl()}/signin

We're excited to help you streamline your hiring process!

Best regards,
The Plato Applicant Tracker Team
    `.trim();
  }

  private generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">🔐</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Reset Your Password</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Plato Applicant Tracker</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Hi ${data.firstName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">We received a request to reset your password.</p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444;">
            <h3 style="color: #991b1b; margin: 0 0 12px 0;">Security Notice</h3>
            <p style="color: #374151; margin: 0; line-height: 1.6;">
              If you didn't request this password reset, please ignore this email. Your account will remain secure.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🔑 Reset Your Password</h3>
              <p style="color: #fecaca; margin: 0 0 24px 0; font-size: 16px;">Click below to create a new password for your account</p>
              <a href="${data.resetLink}"
                 style="background: white; color: #dc2626; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                Reset Password
              </a>
            </div>

            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #92400e; margin: 0; font-weight: 600;">Important:</p>
              <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px;">This reset link will expire in 1 hour for security reasons.</p>
            </div>

            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #ef4444; font-size: 12px; margin: 8px 0 0 0;">
              ${data.resetLink}
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <h3 style="color: #374151; margin: 0 0 12px 0;">Password Security Tips:</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Use a strong, unique password</li>
              <li>Include a mix of letters, numbers, and symbols</li>
              <li>Don't reuse passwords from other accounts</li>
              <li>Consider using a password manager</li>
            </ul>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The Plato Applicant Tracker Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generatePasswordResetEmailText(data: PasswordResetEmailData): string {
    return `
🔐 RESET YOUR PASSWORD - PLATO APPLICANT TRACKER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${data.firstName}!

We received a request to reset your password for your Plato Applicant Tracker account.

SECURITY NOTICE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If you didn't request this password reset, please ignore this email.
Your account will remain secure and no changes will be made.

RESET YOUR PASSWORD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To create a new password, click the link below:

${data.resetLink}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 CLICK THE LINK ABOVE TO RESET YOUR PASSWORD

IMPORTANT: This reset link will expire in 1 hour for security reasons.

PASSWORD SECURITY TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Use a strong, unique password
• Include a mix of letters, numbers, and symbols
• Don't reuse passwords from other accounts
• Consider using a password manager

If you didn't request this password reset, you can safely ignore this email.
The reset link will expire automatically.

Best regards,
The Plato Applicant Tracker Team
    `.trim();
  }
}

export const emailService = new EmailService();
export { VerificationEmailData, VerificationSuccessEmailData, PasswordResetEmailData };