type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatResponse = {
  output_text: string
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function generateAIText(messages: OpenAIMessage[], model = process.env.OPENAI_MODEL || 'gpt-4o-mini') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: messages.map((message) => ({
        role: message.role,
        content: [{ type: 'input_text', text: message.content }],
      })),
      text: {
        format: {
          type: 'text',
        },
      },
    }),
    cache: 'no-store',
  })

  const data = (await response.json()) as ChatResponse & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI request failed')
  }

  return data.output_text || ''
}

export function tryParseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T
  } catch {
    return null
  }
}
