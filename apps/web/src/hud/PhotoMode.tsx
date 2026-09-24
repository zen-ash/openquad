import { useEffect } from 'react'
import { useSettings } from '../settings'

// P hides the whole interface so you can take a clean screenshot
export default function PhotoMode() {
  const photo = useSettings((s) => s.photo)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'KeyP' || e.target instanceof HTMLInputElement) return
      useSettings.setState((s) => ({ photo: !s.photo }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return photo ? <div className="photo-hint">Photo mode &middot; P to go back</div> : null
}
