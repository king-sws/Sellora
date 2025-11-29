import { WELCOME_EMAIL_TEMPLATE, NEWSLETTER_SUBSCRIPTION_TEMPLATE, generateOrderConfirmationEmail } from "./emailtimplate";
import transporter from "./nodemailer";

/**
 * Sends a welcome email to a new user
 * @param email The recipient's email address
 * @param name The recipient's name
 */
export const SendWelcomeEmail = async (email: string, name: string): Promise<void> => {
    const mailOptions = {
        from: `Sellora ${process.env.SENDLER_USER as string}`,
        to: email,
        subject: "Welcome to Sellora!",
        html: WELCOME_EMAIL_TEMPLATE.replace("{userName}", name)
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Welcome email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending welcome email to ${email}:`, error);
        throw error;
    }
};

/**
 * Sends a newsletter subscription confirmation email
 * @param email The subscriber's email address
 */
export const SendNewsletterSubscriptionEmail = async (email: string): Promise<void> => {
    const mailOptions = {
        from: `"Sellora Newsletter" <${process.env.EMAIL_FROM_ADDRESS || process.env.SENDLER_USER}>`,
        to: email,
        subject: "Welcome to Sellora Newsletter! 🎉",
        html: NEWSLETTER_SUBSCRIPTION_TEMPLATE.replace("{userEmail}", email)
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Newsletter subscription email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending newsletter subscription email to ${email}:`, error);
        throw error;
    }
};

export async function sendInvitationEmail(
    email: string,
    workspaceName: string,
    inviteUrl: string
  ) {
    try {
      const result = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Sellora'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'}>`,
        to: email,
        subject: `You're invited to join ${workspaceName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">You've been invited!</h2>
            <p>You've been invited to join <strong>${workspaceName}</strong>.</p>
            <p>Click the button below to accept the invitation:</p>
            <div style="margin: 25px 0;">
              <a 
                href="${inviteUrl}" 
                style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;"
              >
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This invitation will expire in 72 hours.</p>
            <p style="color: #666; font-size: 12px;">If you can't click the button, copy and paste this URL into your browser: ${inviteUrl}</p>
          </div>
        `,
      });
      
      console.log('📧 Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

export const SendPasswordResetEmail = async (
  email: string, 
  name: string, 
  resetToken: string
) => {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Sellora'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SENDLER_USER}>`,
      to: email,
      subject: "Reset Your Password - Sellora",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ccebff; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: #222; margin: 0; text-align: center;">Reset Your Password</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
            
            <p>We received a request to reset your password for your Sellora account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #222; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This link will expire in 1 hour for security purposes.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              If you're having trouble with the button above, copy and paste the URL into your web browser.
            </p>
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              Best regards,<br>
              The Sellora Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},
        
        We received a request to reset your password for your Sellora account.
        
        To reset your password, visit: ${resetUrl}
        
        This link will expire in 1 hour for security purposes.
        
        If you didn't request this, you can safely ignore this email.
        
        Best regards,
        The Sellora Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

export const SendOrderConfirmationEmail = async (orderData: {
  customerName: string
  customerEmail: string
  orderNumber: string
  orderDate: string
  items: Array<{
    name: string
    image: string
    quantity: number
    price: string
  }>
  subtotal: string
  discount?: string
  couponCode?: string
  tax: string
  shipping: string
  total: string
  shippingAddress?: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    state: string
    zipCode: string
    country: string
    phone?: string
  }
  trackingNumber?: string
  carrier?: string
}): Promise<void> => {
  const emailHtml = generateOrderConfirmationEmail(orderData)
  
  const mailOptions = {
    from: `"Sellora - Order Confirmation" <${process.env.SENDLER_USER}>`,
    to: orderData.customerEmail,
    subject: `Order Confirmation - #${orderData.orderNumber} 🎉`,
    html: emailHtml,
    text: `
Order Confirmation - #${orderData.orderNumber}

Hello ${orderData.customerName},

Thank you for your order!

Order Details:
- Order Number: #${orderData.orderNumber}
- Order Date: ${orderData.orderDate}
- Total: ${orderData.total}

${orderData.trackingNumber ? `Tracking Number: ${orderData.trackingNumber}` : 'Your order is being prepared and will ship soon.'}

Items:
${orderData.items.map(item => `- ${item.name} (Qty: ${item.quantity}) - ${item.price}`).join('\n')}

Subtotal: ${orderData.subtotal}
${orderData.discount ? `Discount: -${orderData.discount}` : ''}
Tax: ${orderData.tax}
Shipping: ${orderData.shipping}
Total: ${orderData.total}

${orderData.shippingAddress ? `
Shipping Address:
${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}
${orderData.shippingAddress.address1}
${orderData.shippingAddress.address2 || ''}
${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}
${orderData.shippingAddress.country}
` : ''}

You can view your order details by logging into your account.

Thank you for shopping with Sellora!

Best regards,
The Sellora Team
    `.trim()
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`📧 Order confirmation email sent to ${orderData.customerEmail}`)
  } catch (error) {
    console.error(`Error sending order confirmation email to ${orderData.customerEmail}:`, error)
    throw error
  }
}

export async function sendNewsletterCampaign(
  emails: string[],
  content: {
    subject: string
    headline: string
    message: string
    couponCode?: string
  }
) {
  const { subject, headline, message, couponCode } = content

  // Use proper from address format
  const fromAddress = `"${process.env.EMAIL_FROM_NAME || 'Sellora'}" <${process.env.SENDLER_USER}>`

  const emailPromises = emails.map(async (email) => {
    const unsubscribeLink = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/unsubscribe?email=${encodeURIComponent(email)}`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1f2937; font-size: 28px;">${headline}</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                        ${message.replace(/\n/g, '<br>')}
                      </p>
                    </td>
                  </tr>
                  
                  ${couponCode ? `
                  <!-- Coupon -->
                  <tr>
                    <td align="center" style="padding: 0 40px 30px;">
                      <div style="background-color: #dbeafe; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; display: inline-block;">
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">USE CODE:</p>
                        <p style="margin: 0; color: #1e40af; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${couponCode}</p>
                      </div>
                    </td>
                  </tr>
                  ` : ''}
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                        Shop Now
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">
                        You're receiving this because you subscribed to our newsletter.
                      </p>
                      <a href="${unsubscribeLink}" style="color: #3b82f6; font-size: 12px; text-decoration: underline;">
                        Unsubscribe
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    try {
      const result = await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html: htmlContent
      })
      console.log(`✅ Campaign email sent to ${email}`)
      return { email, success: true, messageId: result.messageId }
    } catch (error) {
      console.error(`❌ Failed to send campaign email to ${email}:`, error)
      // ⚠️ CRITICAL FIX: Return error info instead of throwing
      return { 
        email, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Return all results - both successful and failed
  return Promise.allSettled(emailPromises)
}