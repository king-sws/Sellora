import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { sendNewsletterCampaign } from '@/nodemailer/email'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subject, headline, message, couponCode } = await req.json()

    if (!subject || !headline || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ✅ FIX: Check for correct environment variables
    if (!process.env.SENDLER_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Missing email configuration')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    // Get active subscribers
    const subscribers = await prisma.newsletterSubscription.findMany({
      where: { isActive: true },
      select: { email: true }
    })

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers found' },
        { status: 400 }
      )
    }

    const emailList = subscribers.map(sub => sub.email)
    
    // ✅ FIX: Add parentheses to console.log
    console.log(`📧 Sending campaign to ${emailList.length} subscribers...`)

    // Send emails in smaller batches
    const batchSize = 50
    let sentCount = 0
    let failedCount = 0

    for (let i = 0; i < emailList.length; i += batchSize) {
      const batch = emailList.slice(i, i + batchSize)
      
      try {
        const results = await sendNewsletterCampaign(batch, {
          subject,
          headline,
          message,
          couponCode
        })
        
        // Count successful sends
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            sentCount++
          } else {
            failedCount++
            console.error('Failed to send email:', result.reason)
          }
        })
        
        // ✅ FIX: Add parentheses to console.log
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} complete: ${sentCount} sent, ${failedCount} failed`)
      } catch (error) {
        // ✅ FIX: Add parentheses to console.error
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error)
        failedCount += batch.length
      }

      // Small delay between batches
      if (i + batchSize < emailList.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalSubscribers: emailList.length,
      message: `Campaign sent successfully to ${sentCount} subscribers${failedCount > 0 ? ` (${failedCount} failed)` : ''}`
    })

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to send campaign',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    )
  }
}