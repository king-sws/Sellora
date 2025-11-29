// hooks/useKeyboardShortcuts.ts - Keyboard navigation
import { useEffect } from 'react'

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for CMD/CTRL key combinations
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase()
        const handler = handlers[key]
        
        if (handler) {
          e.preventDefault()
          handler()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}