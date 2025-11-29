/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/customers/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/db/prisma'
import { z } from 'zod'
import transporter from '@/nodemailer/nodemailer' // Import your nodemailer configuration
import type { SentMessageInfo } from 'nodemailer'

const SendEmailSchema = z.object({
  customerIds: z.array(z.string()).min(1, 'At least one customer ID is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  template: z.string().optional(), // Optional email template
  priority: z.enum(['low', 'normal', 'high']).default('normal')
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { customerIds, subject, message, template, priority } = SendEmailSchema.parse(body)

    // Get customer details
    const customers = await prisma.user.findMany({
      where: {
        id: { in: customerIds },
        email: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No valid customers found' },
        { status: 400 }
      )
    }

    const results = []
    const senderInfo = {
      name: session.user.name || 'Admin',
      email: session.user.email || process.env.EMAIL_FROM_ADDRESS || '84f0bb001@smtp-brevo.com'
    }

    // Send emails to each customer
    for (const customer of customers) {
      // Personalize the message outside try-catch so it's available in both blocks
      const personalizedMessage = message
        .replace(/\{customer_name\}/g, customer.name || 'Valued Customer')
        .replace(/\{customer_email\}/g, customer.email || '')

      try {
        // Using Nodemailer with your Brevo SMTP configuration
        const mailOptions = {
          from: `"${senderInfo.name}" <${senderInfo.email}>`,
          to: customer.email!,
          subject: subject,
          html: generateEmailHTML(personalizedMessage, customer, template),
          text: personalizedMessage,
          // Set priority if needed
          priority: (priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'normal') as 'low' | 'normal' | 'high'
        }

        // Send the email
        const result = await transporter.sendMail(mailOptions)
        console.log(`📧 Email sent to ${customer.email}, Message ID: ${result.messageId}`)

        // Log the email in database for audit trail
        await logEmailSent({
          customerId: customer.id,
          sentBy: session.user.id!,
          subject,
          message: personalizedMessage,
          status: 'sent',
          messageId: result.messageId
        })

        results.push({
          success: true,
          customerId: customer.id,
          customerEmail: customer.email,
          customerName: customer.name,
          messageId: result.messageId
        })

      } catch (error) {
        console.error(`Failed to send email to ${customer.email}:`, error)
        
        // Log failed email
        await logEmailSent({
          customerId: customer.id,
          sentBy: session.user.id!,
          subject,
          message: personalizedMessage,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        results.push({
          success: false,
          customerId: customer.id,
          customerEmail: customer.email,
          error: error instanceof Error ? error.message : 'Failed to send email'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Email sending completed: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: customerIds.length,
        successful: successCount,
        failed: failureCount
      }
    })

  } catch (error) {
    console.error('Error sending emails:', error)
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    )
  }
}

// Helper function to generate HTML email content
function generateEmailHTML(message: string, customer: any, template?: string): string {
  const baseHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Message from Your Store</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .content {
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          font-size: 12px;
          color: #666;
        }
        .message-content {
          white-space: pre-wrap;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Your Store</h1>
      </div>
      <div class="content">
        <p>Hello ${customer.name || 'Valued Customer'},</p>
        <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
        <p>Best regards,<br>Your Store Team</p>
      </div>
      <div class="footer">
        <p>This email was sent to ${customer.email}</p>
        <p>If you have any questions, please contact our support team.</p>
      </div>
    </body>
    </html>
  `

  // You can add different templates based on the template parameter
  switch (template) {
    case 'welcome':
      return generateWelcomeTemplate(message, customer)
    case 'promotional':
      return generatePromotionalTemplate(message, customer)
    case 'newsletter':
      return generateNewsletterTemplate(message, customer)
    default:
      return baseHTML
  }
}

// Example template functions
function generateWelcomeTemplate(message: string, customer: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Your Store!</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .content {
          padding: 30px 20px;
        }
        .welcome-badge {
          background-color: #ffd700;
          color: #333;
          padding: 5px 15px;
          border-radius: 20px;
          display: inline-block;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .message-content {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          white-space: pre-wrap;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Your Store!</h1>
          <p>We're excited to have you join our community</p>
        </div>
        <div class="content">
          <div class="welcome-badge">NEW MEMBER</div>
          <h2>Hello ${customer.name || 'Valued Customer'}!</h2>
          <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="footer">
          <p>This email was sent to ${customer.email}</p>
          <p>Thank you for choosing Your Store!</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generatePromotionalTemplate(message: string, customer: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Special Offer Just for You!</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .promo-badge {
          background-color: #ffd700;
          color: #333;
          padding: 10px 20px;
          border-radius: 25px;
          display: inline-block;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          padding: 30px 20px;
        }
        .message-content {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          white-space: pre-wrap;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎁 Special Offer!</h1>
          <p>Exclusive deal just for you</p>
        </div>
        <div class="content">
          <div class="promo-badge">LIMITED TIME</div>
          <h2>Hi ${customer.name || 'Valued Customer'}!</h2>
          <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="footer">
          <p>This email was sent to ${customer.email}</p>
          <p>Offer valid while supplies last. Terms and conditions apply.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateNewsletterTemplate(message: string, customer: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Store Newsletter</title>
      <style>
        body {
          font-family: Georgia, serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 5px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #2c3e50;
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .newsletter-date {
          background-color: #34495e;
          color: white;
          padding: 8px 15px;
          border-radius: 15px;
          display: inline-block;
          font-size: 12px;
          margin-bottom: 15px;
        }
        .content {
          padding: 30px 20px;
        }
        .message-content {
          border-left: 4px solid #3498db;
          padding-left: 20px;
          margin: 20px 0;
          white-space: pre-wrap;
        }
        .footer {
          background-color: #ecf0f1;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #7f8c8d;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="newsletter-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <h1>📰 Your Store Newsletter</h1>
          <p>Stay updated with our latest news and offers</p>
        </div>
        <div class="content">
          <h2>Hello ${customer.name || 'Dear Reader'}!</h2>
          <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="footer">
          <p>This newsletter was sent to ${customer.email}</p>
          <p>You're receiving this because you're a valued member of our community.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Log email sending activity - Updated to avoid foreign key constraint
async function logEmailSent({
  customerId,
  sentBy,
  subject,
  message,
  status,
  error,
  messageId
}: {
  customerId: string
  sentBy: string
  subject: string
  message: string
  status: 'sent' | 'failed'
  error?: string
  messageId?: string
}): Promise<void> {
  try {
    // Create a simple log entry without foreign key dependency
    // You might want to create a dedicated EmailLog table instead
    console.log('📧 Email Log:', {
      customerId,
      sentBy,
      subject,
      status,
      messageId,
      error,
      timestamp: new Date().toISOString()
    });

    // Alternative: Create a dedicated email log table instead of using orderNote
    // await prisma.emailLog.create({
    //   data: {
    //     customerId,
    //     sentBy,
    //     subject,
    //     message: message.substring(0, 500),
    //     status,
    //     error,
    //     messageId,
    //     createdAt: new Date()
    //   }
    // })
    
  } catch (logError) {
    console.error('Failed to log email activity:', logError)
    // Don't throw here as logging failure shouldn't break email sending
  }
}