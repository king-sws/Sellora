import { Suspense } from 'react'
import CreateCouponContent from './create-coupon-content'
import { Loader2 } from 'lucide-react'

export default function CreateCouponPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-900" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateCouponContent />
    </Suspense>
  )
}