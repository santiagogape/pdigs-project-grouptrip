import OpenAI from 'openai'

export interface TripFormSuggestion {
  destino: string
  presupuesto: number
  duracionDias: number
  fechaInicio?: string
  fechaFin?: string
  nombre: string
  descripcion: string
  urlPortada?: string
}

export interface InitialProjectEventSuggestion {
  nombre: string
  tipo: string
  fechaHoraInicio: string
  fechaHoraFin: string
  precio?: number
  lugar?: string
}

export interface GenerateInitialEventsInput {
  nombre: string
  destino: string
  descripcion: string
  presupuesto: number
  fechaInicio: number
  fechaFin: number
}

class OpenAIService {
  private client: OpenAI
  private requestQueue: number[]
  private maxRequestsPerMinute: number

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Only for demo - use backend in production
    })

    this.requestQueue = []
    this.maxRequestsPerMinute = Number.parseInt(import.meta.env.VITE_MAX_REQUESTS_PER_MINUTE ?? '10', 10) || 10
  }

  async summarizeText(text: string, maxTokens = 150): Promise<{ summary: string; tokensUsed: number; cost: number }> {
    await this.enforceRateLimit()

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise, accurate summaries of text content.'
          },
          {
            role: 'user',
            content: `Please summarize the following text in ${maxTokens} tokens or less:\n\n${text}`
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      })

      const tokensUsed = response.usage?.total_tokens ?? 0

      return {
        summary: response.choices[0]?.message?.content ?? '',
        tokensUsed,
        cost: this.calculateCost(tokensUsed)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`OpenAI API Error: ${message}`)
    }
  }

  async generateTripFormSuggestion(prompt: string): Promise<TripFormSuggestion> {
    await this.enforceRateLimit()

    try {
      const today = new Date().toISOString().slice(0, 10)
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You generate travel plan form fields. Return only valid JSON with keys destino (string), presupuesto (number), duracionDias (integer >= 1), fechaInicio (YYYY-MM-DD, optional), fechaFin (YYYY-MM-DD, optional), nombre (string), descripcion (string), urlPortada (optional string URL). If the prompt references relative dates like "next month" or a month name like "in May", convert them into exact dates using the provided current date. Prefer future dates. Do not invent weird image URLs.'
          },
          {
            role: 'user',
            content: `Current date: ${today}. Create trip form details from this prompt: ${prompt}`
          }
        ],
        temperature: 0.4
      })

      const rawContent = response.choices[0]?.message?.content ?? '{}'
      const parsed = this.extractJsonObject(rawContent)

      return {
        destino: this.asNonEmptyString(parsed.destino, 'Destino sugerido'),
        presupuesto: this.asPositiveNumber(parsed.presupuesto, 1000),
        duracionDias: Math.max(1, Math.round(this.asPositiveNumber(parsed.duracionDias, 5))),
        fechaInicio: this.asValidDateString(parsed.fechaInicio),
        fechaFin: this.asValidDateString(parsed.fechaFin),
        nombre: this.asNonEmptyString(parsed.nombre, 'Viaje personalizado'),
        descripcion: this.asNonEmptyString(parsed.descripcion, 'Viaje generado con IA'),
        urlPortada: this.asReasonableImageUrl(parsed.urlPortada)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`OpenAI API Error: ${message}`)
    }
  }

  async generateInitialProjectEvents(project: GenerateInitialEventsInput): Promise<InitialProjectEventSuggestion[]> {
    await this.enforceRateLimit()

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You generate a small starter itinerary for a trip. Return only valid JSON as an array of 3 to 5 objects. Each object must have: nombre (string), tipo (string), fechaHoraInicio (ISO 8601 string), fechaHoraFin (ISO 8601 string), precio (number, optional), lugar (string, optional). Keep the events realistic, spread across the trip dates, and aligned with the project description. Do not include markdown or extra text.'
          },
          {
            role: 'user',
            content:
              `Trip name: ${project.nombre}\nDestination: ${project.destino}\nDescription: ${project.descripcion}\nBudget: ${project.presupuesto}\nStart timestamp: ${project.fechaInicio}\nEnd timestamp: ${project.fechaFin}\nCreate an initial itinerary.`
          }
        ],
        temperature: 0.6
      })

      const rawContent = response.choices[0]?.message?.content ?? '[]'
      const parsed = this.extractJsonArray(rawContent)

      const events: InitialProjectEventSuggestion[] = []

      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) {
          continue
        }

        const record = item as Record<string, unknown>
        const fechaHoraInicio = this.asValidDateTimeString(record.fechaHoraInicio)
        const fechaHoraFin = this.asValidDateTimeString(record.fechaHoraFin)

        if (!fechaHoraInicio || !fechaHoraFin) {
          continue
        }

        events.push({
          nombre: this.asNonEmptyString(record.nombre, 'Actividad inicial'),
          tipo: this.asNonEmptyString(record.tipo, 'Actividad'),
          fechaHoraInicio,
          fechaHoraFin,
          precio: typeof record.precio === 'number' && Number.isFinite(record.precio) && record.precio >= 0 ? record.precio : undefined,
          lugar: typeof record.lugar === 'string' && record.lugar.trim().length > 0 ? record.lugar.trim() : undefined
        })
      }

      return events
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`OpenAI API Error: ${message}`)
    }
  }

  async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    this.requestQueue = this.requestQueue.filter((time: number) => now - time < 60000)

    if (this.requestQueue.length >= this.maxRequestsPerMinute) {
      const oldestRequestTime = this.requestQueue[0] ?? now
      const waitTime = Math.max(0, 60000 - (now - oldestRequestTime))
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.requestQueue.push(now)
  }

  calculateCost(tokens: number): number {
    // GPT-3.5-turbo pricing: $0.002 per 1K tokens
    return (tokens / 1000) * 0.002
  }

  private extractJsonObject(text: string): Record<string, unknown> {
    const trimmed = text.trim()

    try {
      return JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('The model response did not include a valid JSON object.')
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>
    }
  }

  private extractJsonArray(text: string): unknown[] {
    const trimmed = text.trim()

    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
      }
      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.events)) {
          return record.events
        }
      }
    } catch {
      const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        const parsed = JSON.parse(arrayMatch[0]) as unknown
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    }

    throw new Error('The model response did not include a valid JSON array.')
  }

  private asPositiveNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value
    }
    return fallback
  }

  private asNonEmptyString(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
    return fallback
  }

  private asValidDateString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined
    }

    const candidate = value.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return undefined
    }

    const parsed = new Date(`${candidate}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? undefined : candidate
  }

  private asValidDateTimeString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined
    }

    const candidate = value.trim()
    const parsed = new Date(candidate)

    if (Number.isNaN(parsed.getTime())) {
      return undefined
    }

    return candidate
  }

  private asReasonableImageUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined
    }

    const candidate = value.trim()
    if (!candidate) {
      return undefined
    }

    try {
      const url = new URL(candidate)
      const allowedHosts = new Set([
        'images.unsplash.com',
        'source.unsplash.com',
        'picsum.photos',
        'images.pexels.com',
        'cdn.pixabay.com'
      ])
      const hasImageExtension = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url.pathname + url.search)

      if (allowedHosts.has(url.hostname) || hasImageExtension) {
        return candidate
      }
    } catch {
      return undefined
    }

    return undefined
  }
}

export default new OpenAIService()
