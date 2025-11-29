/* eslint-disable @typescript-eslint/no-explicit-any */
// components/admin/SettingsForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  RefreshCw, 
  Store, 
  Palette, 
  Mail, 
  CreditCard, 
  Truck, 
  Package,
  Search,
  Share2,
  Settings as SettingsIcon
} from 'lucide-react'
import { toast } from 'sonner'

interface Setting {
  value: any
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'IMAGE' | 'EMAIL'
  category: string
  description?: string
  isPublic: boolean
}

interface Settings {
  [key: string]: Setting
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('GENERAL')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }))
  }

  const createSetting = (key: string, value: any, type: Setting['type'], category: string, description?: string, isPublic = false) => {
    if (!settings[key]) {
      setSettings(prev => ({
        ...prev,
        [key]: {
          value,
          type,
          category,
          description,
          isPublic
        }
      }))
    }
  }

  // Initialize default settings
  useEffect(() => {
    if (!loading && Object.keys(settings).length === 0) {
      // General Settings
      createSetting('store_name', 'My Store', 'STRING', 'GENERAL', 'The name of your store', true)
      createSetting('store_description', 'Best products online', 'STRING', 'GENERAL', 'Store description for SEO', true)
      createSetting('store_email', 'contact@store.com', 'EMAIL', 'GENERAL', 'Primary contact email')
      createSetting('store_phone', '+1 (555) 123-4567', 'STRING', 'GENERAL', 'Contact phone number', true)
      createSetting('store_address', '123 Main St, City, State 12345', 'STRING', 'GENERAL', 'Physical store address', true)
      
      // Appearance
      createSetting('theme_color', '#3b82f6', 'STRING', 'APPEARANCE', 'Primary brand color', true)
      createSetting('logo_url', '', 'IMAGE', 'APPEARANCE', 'Store logo URL', true)
      createSetting('favicon_url', '', 'IMAGE', 'APPEARANCE', 'Favicon URL', true)
      
      // Inventory
      createSetting('low_stock_threshold', 10, 'NUMBER', 'INVENTORY', 'Alert when stock falls below this number')
      createSetting('auto_reduce_stock', true, 'BOOLEAN', 'INVENTORY', 'Automatically reduce stock on orders')
      createSetting('allow_backorders', false, 'BOOLEAN', 'INVENTORY', 'Allow orders when out of stock')
      
      // Email
      createSetting('smtp_host', '', 'STRING', 'EMAIL', 'SMTP server hostname')
      createSetting('smtp_port', 587, 'NUMBER', 'EMAIL', 'SMTP server port')
      createSetting('smtp_user', '', 'EMAIL', 'EMAIL', 'SMTP username')
      createSetting('smtp_password', '', 'STRING', 'EMAIL', 'SMTP password')
      
      // Payment
      createSetting('stripe_public_key', '', 'STRING', 'PAYMENT', 'Stripe publishable key', true)
      createSetting('stripe_secret_key', '', 'STRING', 'PAYMENT', 'Stripe secret key')
      createSetting('paypal_client_id', '', 'STRING', 'PAYMENT', 'PayPal client ID', true)
      createSetting('cash_on_delivery', false, 'BOOLEAN', 'PAYMENT', 'Enable cash on delivery', true)
      
      // Shipping
      createSetting('free_shipping_threshold', 100, 'NUMBER', 'SHIPPING', 'Free shipping minimum amount', true)
      createSetting('default_shipping_rate', 10, 'NUMBER', 'SHIPPING', 'Default shipping cost', true)
      createSetting('shipping_zones', '[]', 'JSON', 'SHIPPING', 'Shipping zones configuration')
      
      // SEO
      createSetting('meta_title', 'My Store - Best Products Online', 'STRING', 'SEO', 'Default page title', true)
      createSetting('meta_description', 'Find the best products at great prices', 'STRING', 'SEO', 'Default meta description', true)
      createSetting('google_analytics_id', '', 'STRING', 'SEO', 'Google Analytics tracking ID', true)
      
      // Social
      createSetting('facebook_url', '', 'STRING', 'SOCIAL', 'Facebook page URL', true)
      createSetting('instagram_url', '', 'STRING', 'SOCIAL', 'Instagram profile URL', true)
      createSetting('twitter_url', '', 'STRING', 'SOCIAL', 'Twitter profile URL', true)
    }
  }, [loading, settings])

  const renderField = (key: string, setting: Setting) => {
    switch (setting.type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={setting.value || false}
              onCheckedChange={(checked) => updateSetting(key, checked)}
            />
            <Label>{setting.description}</Label>
            {setting.isPublic && <Badge variant="secondary" className="text-xs">Public</Badge>}
          </div>
        )
      
      case 'NUMBER':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
              {setting.isPublic && <Badge variant="secondary" className="text-xs">Public</Badge>}
            </div>
            <Input
              type="number"
              value={setting.value || 0}
              onChange={(e) => updateSetting(key, parseFloat(e.target.value) || 0)}
            />
            {setting.description && (
              <p className="text-sm text-gray-600">{setting.description}</p>
            )}
          </div>
        )
      
      case 'EMAIL':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
              {setting.isPublic && <Badge variant="secondary" className="text-xs">Public</Badge>}
            </div>
            <Input
              type="email"
              value={setting.value || ''}
              onChange={(e) => updateSetting(key, e.target.value)}
            />
            {setting.description && (
              <p className="text-sm text-gray-600">{setting.description}</p>
            )}
          </div>
        )
      
      default:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
              {setting.isPublic && <Badge variant="secondary" className="text-xs">Public</Badge>}
            </div>
            {key.includes('description') || key.includes('address') ? (
              <Textarea
                value={setting.value || ''}
                onChange={(e) => updateSetting(key, e.target.value)}
                rows={3}
              />
            ) : (
              <Input
                type={key.includes('password') ? 'password' : 'text'}
                value={setting.value || ''}
                onChange={(e) => updateSetting(key, e.target.value)}
              />
            )}
            {setting.description && (
              <p className="text-sm text-gray-600">{setting.description}</p>
            )}
          </div>
        )
    }
  }

  const getSettingsByCategory = (category: string) => {
    return Object.entries(settings).filter(([_, setting]) => setting.category === category)
  }

  const categories = [
    { key: 'GENERAL', label: 'General', icon: Store },
    { key: 'APPEARANCE', label: 'Appearance', icon: Palette },
    { key: 'INVENTORY', label: 'Inventory', icon: Package },
    { key: 'EMAIL', label: 'Email', icon: Mail },
    { key: 'PAYMENT', label: 'Payment', icon: CreditCard },
    { key: 'SHIPPING', label: 'Shipping', icon: Truck },
    { key: 'SEO', label: 'SEO', icon: Search },
    { key: 'SOCIAL', label: 'Social', icon: Share2 }
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-gray-600 mt-1">Configure your store preferences and integrations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
          {categories.map(category => (
            <TabsTrigger key={category.key} value={category.key} className="flex items-center gap-2">
              <category.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.key} value={category.key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="w-5 h-5" />
                  {category.label} Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {getSettingsByCategory(category.key).map(([key, setting]) => (
                  <div key={key}>
                    {renderField(key, setting)}
                  </div>
                ))}
                {getSettingsByCategory(category.key).length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No settings configured for this category yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}