import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { lastSaidBy, useChat } from '../net/chat'

const SHOW_FOR = 6000

// what someone last said, floating over their head for a few seconds
export default function ChatBubble({ id }: { id: string }) {
  const last = useChat((s) => lastSaidBy(s.messages, id))
  const [expired, setExpired] = useState<number | null>(null)

  useEffect(() => {
    if (!last) return
    const timer = setTimeout(() => setExpired(last.key), last.at + SHOW_FOR - Date.now())
    return () => clearTimeout(timer)
  }, [last])

  if (!last || expired === last.key) return null
  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
      <div className="bubble">{last.text}</div>
    </Html>
  )
}
