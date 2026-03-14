'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Send, X, TriangleAlert } from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function AIChat({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can help with medication instructions, refill guidance, and pharmacy questions.',
    },
  ])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const [needsEscalation, setNeedsEscalation] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  function appendMessage(message: ChatMessage) {
    setMessages((prev) => [...prev, message])
    requestAnimationFrame(() => {
      const container = containerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isPending) return

    setInput('')
    appendMessage({ role: 'user', content: text })
    setNeedsEscalation(false)

    startTransition(async () => {
      try {
        const response = await fetch('/api/ai/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            patientId,
            conversationId,
          }),
        })

        if (!response.ok) {
          appendMessage({
            role: 'assistant',
            content: 'I could not process that request right now. Please contact the pharmacy directly.',
          })
          return
        }

        const incomingConversationId = response.headers.get('X-Conversation-Id')
        if (incomingConversationId) {
          setConversationId(incomingConversationId)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          appendMessage({
            role: 'assistant',
            content: 'No AI response was received.',
          })
          return
        }

        let aggregate = ''
        appendMessage({ role: 'assistant', content: '' })

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          aggregate += new TextDecoder().decode(value)
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: aggregate }
            }
            return copy
          })
        }

        if (/pharmacist|doctor|emergency|urgent/i.test(aggregate)) {
          setNeedsEscalation(true)
        }
      } catch {
        appendMessage({
          role: 'assistant',
          content: 'Network issue while reaching AI assistant. Please call the pharmacy.',
        })
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-40 rounded-full h-12 w-12 p-0 shadow-lg"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>

      {open && (
        <Card
          className="fixed bottom-20 right-5 z-40 w-[calc(100vw-2rem)] max-w-md h-[70vh] shadow-2xl border"
          role="dialog"
          aria-label="Pharmacy AI assistant"
        >
          <CardHeader className="py-3">
            <CardTitle className="text-base">PharmaCare AI</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4.5rem)] flex flex-col gap-3">
            <div ref={containerRef} className="flex-1 overflow-y-auto space-y-2 pr-1" aria-live="polite">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === 'assistant'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-blue-600 text-white ml-8'
                  }`}
                >
                  {message.content || (message.role === 'assistant' && isPending ? '...' : '')}
                </div>
              ))}
            </div>

            {needsEscalation && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 flex items-start gap-2">
                <TriangleAlert className="w-4 h-4 mt-0.5" />
                <div className="space-y-2">
                  <p>AI recommends pharmacist follow-up for this question.</p>
                  <Button type="button" size="sm" variant="outline">Ask Your Pharmacist</Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder="Ask about medications, side effects, refills..."
                className="h-9 flex-1 rounded-md border px-3 text-sm"
                aria-label="Message PharmaCare AI"
              />
              <Button type="button" onClick={() => void sendMessage()} disabled={isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
