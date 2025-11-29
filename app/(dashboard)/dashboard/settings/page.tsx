/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Save, AlertCircle, CheckCircle, Settings, Mail, Palette, CreditCard, Truck, Package, Search, Globe, Zap, Loader2, RefreshCw } from 'lucide-react'

interface SettingValue {
  value: any
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'IMAGE' | 'EMAIL'
  category: 'GENERAL' | 'APPEARANCE' | 'EMAIL' | 'PAYMENT' | 'SHIPPING' | 'INVENTORY' | 'SEO' | 'SOCIAL' | 'ADVANCED'
  description?: string | null
  isPublic: boolean
}

interface ApiResponse {
  success: boolean
  data: Record<string, SettingValue>
  meta?: {
    total: number
    categories: string[]
    lastUpdated: string
  }
  error?: string
  details?: any[]
}

const CATEGORY_ICONS = {
  GENERAL: Settings,
  APPEARANCE: Palette,
  EMAIL: Mail,
  PAYMENT: CreditCard,
  SHIPPING: Truck,
  INVENTORY: Package,
  SEO: Search,
  SOCIAL: Globe,
  ADVANCED: Zap
}

const CATEGORY_DESCRIPTIONS = {
  GENERAL: 'Basic store configuration and general settings',
  APPEARANCE: 'Theme, colors, and visual customization',
  EMAIL: 'Email notifications and SMTP configuration',
  PAYMENT: 'Payment gateways and transaction settings',
  SHIPPING: 'Shipping methods and delivery options',
  INVENTORY: 'Stock management and product settings',
  SEO: 'Search engine optimization settings',
  SOCIAL: 'Social media integration and sharing',
  ADVANCED: 'Advanced technical configurations'
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingValue>>({})
  const [originalSettings, setOriginalSettings] = useState<Record<string, SettingValue>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('GENERAL')

  useEffect(() => {
    fetchSettings()
  }, [])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/settings')
      const result: ApiResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch settings')
      }
      
      if (result.success && result.data) {
        setSettings(result.data)
        setOriginalSettings(JSON.parse(JSON.stringify(result.data)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Only send changed settings
      const changedSettings: Record<string, SettingValue> = {}
      Object.keys(settings).forEach(key => {
        const current = settings[key]
        const original = originalSettings[key]
        
        if (!original || JSON.stringify(current) !== JSON.stringify(original)) {
          changedSettings[key] = current
        }
      })

      if (Object.keys(changedSettings).length === 0) {
        setSuccess('No changes to save')
        return
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedSettings)
      })
      
      const result: ApiResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }
      
      if (result.success) {
        setSuccess(`Successfully updated ${Object.keys(changedSettings).length} settings`)
        setOriginalSettings(JSON.parse(JSON.stringify(settings)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, field: keyof SettingValue, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }))
  }

  const renderSettingInput = (key: string, setting: SettingValue) => {
    const baseClasses = "w-full"
    
    switch (setting.type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(setting.value)}
              onCheckedChange={(checked) => updateSetting(key, 'value', checked)}
            />
            <Label className="text-sm font-medium">
              {Boolean(setting.value) ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        )
      
      case 'NUMBER':
        return (
          <Input
            type="number"
            className={baseClasses}
            value={setting.value || 0}
            onChange={(e) => updateSetting(key, 'value', parseFloat(e.target.value) || 0)}
            placeholder="Enter number"
          />
        )
      
      case 'EMAIL':
        return (
          <Input
            type="email"
            className={baseClasses}
            value={setting.value || ''}
            onChange={(e) => updateSetting(key, 'value', e.target.value)}
            placeholder="Enter email address"
          />
        )
      
      case 'JSON':
        return (
          <Textarea
            className={`${baseClasses} font-mono text-sm`}
            value={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2)}
            onChange={(e) => updateSetting(key, 'value', e.target.value)}
            rows={6}
            placeholder="Enter JSON data"
          />
        )
      
      case 'IMAGE':
        return (
          <div className="space-y-2">
            <Input
              type="url"
              className={baseClasses}
              value={setting.value || ''}
              onChange={(e) => updateSetting(key, 'value', e.target.value)}
              placeholder="Enter image URL"
            />
            {setting.value && (
              <div className="mt-2">
                <img 
                  src={setting.value} 
                  alt="Setting preview" 
                  className="max-w-xs max-h-32 rounded-lg border object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>
        )
      
      default: // STRING
        return (
          <Input
            type="text"
            className={baseClasses}
            value={setting.value || ''}
            onChange={(e) => updateSetting(key, 'value', e.target.value)}
            placeholder="Enter text value"
          />
        )
    }
  }

  const getSettingsByCategory = (category: string) => {
    return Object.entries(settings).filter(([, setting]) => setting.category === category)
  }

  const formatSettingKey = (key: string) => {
    return key.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const categories = Object.keys(CATEGORY_ICONS)
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your store configuration and preferences</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
              Unsaved changes
            </Badge>
          )}
          
          <Button 
            onClick={saveSettings} 
            disabled={saving || !hasUnsavedChanges}
            className="min-w-[120px]"
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        {/* Tab Navigation */}
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
              const settingsCount = getSettingsByCategory(category).length
              
              return (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{category}</span>
                  <span className="sm:hidden">{category.slice(0, 3)}</span>
                  {settingsCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {settingsCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Tab Content */}
        {categories.map((category) => {
          const categorySettings = getSettingsByCategory(category)
          const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
          
          return (
            <TabsContent key={category} value={category} className="mt-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div>{category} Settings</div>
                      <CardDescription className="mt-1">
                        {CATEGORY_DESCRIPTIONS[category as keyof typeof CATEGORY_DESCRIPTIONS]}
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  {categorySettings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Settings className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No settings found</h3>
                      <p className="text-muted-foreground">No settings have been configured for this category yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {categorySettings.map(([key, setting], index) => (
                        <div key={key}>
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Setting Info */}
                            <div className="lg:col-span-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">
                                  {formatSettingKey(key)}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={setting.isPublic ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {setting.isPublic ? 'Public' : 'Private'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {setting.type.toLowerCase()}
                                  </Badge>
                                </div>
                              </div>
                              {setting.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {setting.description}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                Key: {key}
                              </div>
                            </div>

                            {/* Setting Value */}
                            <div className="lg:col-span-5 space-y-3">
                              <Label className="text-sm font-medium text-muted-foreground">Current Value</Label>
                              {renderSettingInput(key, setting)}
                            </div>

                            {/* Setting Controls */}
                            <div className="lg:col-span-3 space-y-4">
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">Type</Label>
                                  <Select
                                    value={setting.type}
                                    onValueChange={(value) => updateSetting(key, 'type', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="STRING">String</SelectItem>
                                      <SelectItem value="NUMBER">Number</SelectItem>
                                      <SelectItem value="BOOLEAN">Boolean</SelectItem>
                                      <SelectItem value="JSON">JSON</SelectItem>
                                      <SelectItem value="EMAIL">Email</SelectItem>
                                      <SelectItem value="IMAGE">Image URL</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-muted-foreground">
                                    Public Access
                                  </Label>
                                  <Switch
                                    checked={setting.isPublic}
                                    onCheckedChange={(checked) => updateSetting(key, 'isPublic', checked)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {index < categorySettings.length - 1 && (
                            <Separator className="mt-6" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}