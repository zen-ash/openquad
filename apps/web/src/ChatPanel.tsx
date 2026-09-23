import { MAX_CHAT_LENGTH } from '@quad/shared'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useChat } from './net/chat'
import { send } from './net/connection'
import { isTouchScreen } from './TouchControls'

const SHOWN = 8

export default function ChatPanel() {
  // select the array itself and slice here. slicing inside the selector makes a new
  // array every time, which zustand reads as a change and re-renders forever
  const messages = useChat((s) => s.messages).slice(-SHOWN)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  // enter anywhere starts typing, like most games
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || document.activeElement === input.current) return
      e.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) send({ type: 'chat', text: trimmed })
    setText('')
    // back to walking around
    input.current?.blur()
  }

  return (
    <div className="chat">
      <ul aria-label="Chat messages" aria-live="polite">
        {messages.map((m) => (
          <li key={m.key}>
            <b>{m.name}</b> {m.text}
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <input
          ref={input}
          aria-label="Chat message"
          placeholder={isTouchScreen ? 'Tap to chat' : 'Press Enter to chat'}
          value={text}
          maxLength={MAX_CHAT_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') input.current?.blur()
          }}
          autoComplete="off"
        />
      </form>
    </div>
  )
}
