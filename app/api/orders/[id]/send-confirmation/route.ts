// app/api/orders/[id]/send-confirmation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { formatPrice, formatDate } from '@/lib/utils'
import { SendOrderConfirmationEmail } from '@/nodemailer/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Get the base URL for absolute image paths
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Fetch order with all necessary relations
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                slug: true,
                price: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        shippingAddress: true,
        coupon: {
          select: {
            code: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.user.email) {
      return NextResponse.json({ 
        error: 'Customer email not found' 
      }, { status: 400 })
    }

    // ✅ Helper function to convert relative URLs to absolute
    const getAbsoluteImageUrl = (imagePath: string): string => {
      // If already absolute URL, return as is
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath
      }
      
      // If relative path, make it absolute
      if (imagePath.startsWith('/')) {
        return `${baseUrl}${imagePath}`
      }
      
      // If no leading slash, add one
      return `${baseUrl}/${imagePath}`
    }

    // ✅ Prepare email data with absolute image URLs
    const emailData = {
      customerName: order.user.name || 'Valued Customer',
      customerEmail: order.user.email,
      orderNumber: order.orderNumber,
      orderDate: formatDate(order.createdAt, 'PPP'),
      items: order.items.map(item => {
        // ✅ Get the image URL and convert to absolute
        const imageUrl = item.product.images[0] || '/images/placeholder.png'
        const absoluteImageUrl = getAbsoluteImageUrl(imageUrl)
        
        return {
          name: item.product.name,
          image: absoluteImageUrl, // ✅ Now using absolute URL
          quantity: item.quantity,
          price: formatPrice(item.price * item.quantity)
        }
      }),
      subtotal: formatPrice(order.subtotal),
      discount: order.discount > 0 ? formatPrice(order.discount) : undefined,
      couponCode: order.coupon?.code,
      tax: formatPrice(order.tax),
      shipping: formatPrice(order.shipping),
      total: formatPrice(order.total),
      shippingAddress: order.shippingAddress ? {
        firstName: order.shippingAddress.firstName,
        lastName: order.shippingAddress.lastName,
        address1: order.shippingAddress.address1,
        address2: order.shippingAddress.address2 || undefined,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zipCode: order.shippingAddress.zipCode,
        country: order.shippingAddress.country,
        phone: order.shippingAddress.phone || undefined
      } : undefined,
      trackingNumber: order.trackingNumber || undefined,
      // carrier: order.carrier || undefined
    }

    try {
      // Send email using your existing utility function
      await SendOrderConfirmationEmail(emailData)
      
      // Log the email sending in order notes
      await prisma.orderNote.create({
        data: {
          orderId: order.id,
          content: `Order confirmation email sent to ${order.user.email}`,
          isInternal: true,
          authorId: session.user.id
        }
      })

      return NextResponse.json({ 
        success: true,
        message: 'Order confirmation sent successfully',
        sentTo: order.user.email
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      
      // Log failed attempt
      await prisma.orderNote.create({
        data: {
          orderId: order.id,
          content: `Failed to send order confirmation email to ${order.user.email}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
          isInternal: true,
          authorId: session.user.id
        }
      })
      
      throw new Error('Failed to send email. Please check your email configuration.')
    }

  } catch (error) {
    console.error('Error sending order confirmation:', error)
    return NextResponse.json({ 
      error: 'Failed to send order confirmation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}