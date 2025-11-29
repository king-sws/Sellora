'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Mail, 
  Send, 
  Users, 
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface CampaignTemplate {
  id: string
  name: string
  subject: string
  preview: string
}

export default function NewsletterCampaignManager() {
  const [subject, setSubject] = useState('')
  const [headline, setHeadline] = useState('')
  const [message, setMessage] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [activeSubscribers, setActiveSubscribers] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Fetch active subscriber count
  useState(() => {
    fetch('/api/admin/newsletter?isActive=true&limit=1')
      .then(res => res.json())
      .then(data => setActiveSubscribers(data.stats.active))
      .catch(err => console.error('Failed to fetch subscriber count:', err))
  })

  const templates: CampaignTemplate[] = [
    {
      id: 'weekly',
      name: 'Weekly Deals',
      subject: '🎉 This Week\'s Best Deals Are Here!',
      preview: 'Featured products and exclusive offers just for you'
    },
    {
      id: 'new-arrivals',
      name: 'New Arrivals',
      subject: '✨ Fresh Arrivals You\'ll Love',
      preview: 'Check out our newest products before they sell out'
    },
    {
      id: 'exclusive',
      name: 'Exclusive Offer',
      subject: '🔥 Exclusive Offer Inside - Limited Time!',
      preview: 'Special discount for our newsletter subscribers'
    }
  ]

  const loadTemplate = (template: CampaignTemplate) => {
    setSubject(template.subject)
    setHeadline(template.name)
    setMessage(template.preview)
    toast.success('Template loaded')
  }

  const handleSendCampaign = async () => {
    if (!subject || !headline || !message) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!confirm(`Send newsletter to ${activeSubscribers.toLocaleString()} subscribers?`)) {
      return
    }

    setIsSending(true)
    setSendStatus('idle')

    try {
      const response = await fetch('/api/admin/newsletter/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          headline,
          message,
          couponCode: couponCode || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send campaign')
      }

      setSendStatus('success')
      toast.success(`Campaign sent to ${data.sentCount} subscribers!`)
      
      // Clear form
      setSubject('')
      setHeadline('')
      setMessage('')
      setCouponCode('')

    } catch (error) {
      console.error('Campaign send error:', error)
      setSendStatus('error')
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  
  {/* Title + Subtitle */}
  <div>
    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
      Newsletter Campaign Manager
    </h1>
    <p className="text-gray-600 mt-1 text-sm sm:text-base">
      Create and send email campaigns to your subscribers
    </p>
  </div>

  {/* Back Button */}
  <Button asChild variant="outline" className="whitespace-nowrap self-start sm:self-auto">
    <Link href="/dashboard/newsletter" className="flex items-center gap-1">
      ← Back to Newsletter
    </Link>
  </Button>

</div>


      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subscribers</p>
              <p className="text-3xl font-bold text-blue-600">
                {activeSubscribers.toLocaleString()}
              </p>
            </div>
            <Users className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Send Status Alert */}
      {sendStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Campaign Sent Successfully!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your newsletter has been sent to all active subscribers.
          </AlertDescription>
        </Alert>
      )}

      {sendStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Campaign Failed</AlertTitle>
          <AlertDescription>
            There was an error sending your campaign. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template)}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <p className="font-semibold text-sm mb-1">{template.name}</p>
                <p className="text-xs text-gray-600">{template.subject}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject *
            </label>
            <Input
              placeholder="e.g., 🎉 Exclusive Weekend Sale - 25% Off Everything!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{subject.length}/100 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Headline *
            </label>
            <Input
              placeholder="e.g., Weekend Flash Sale"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <Textarea
              placeholder="Write your newsletter message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Keep it concise and engaging. Include a clear call-to-action.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Code (Optional)
            </label>
            <Input
              placeholder="e.g., WELCOME25"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-gray-500 mt-1">
              Include a discount code to boost engagement
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSendCampaign}
              disabled={isSending || !subject || !headline || !message}
              className="flex-1"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending to {activeSubscribers.toLocaleString()} subscribers...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Campaign
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!subject || !headline || !message}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && subject && headline && message && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg">Email Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-500">Subject:</p>
                <p className="font-semibold">{subject}</p>
              </div>
              
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">{headline}</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
                
                {couponCode && (
                  <div className="inline-block bg-blue-100 border-2 border-dashed border-blue-400 px-6 py-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Use code:</p>
                    <p className="text-xl font-bold text-blue-700">{couponCode}</p>
                  </div>
                )}
                
                <button className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800">
                  Shop Now
                </button>
              </div>
              
              <div className="text-center text-xs text-gray-500 border-t pt-4 mt-4">
                <p>You&apos;re receiving this email because you subscribed to our newsletter.</p>
                <a href="#" className="text-blue-600 hover:underline">Unsubscribe</a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}