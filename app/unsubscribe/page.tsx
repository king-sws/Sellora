import { Suspense } from 'react'
import UnsubscribeContent from './components/unsubscribe-content'

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}