import OpenAI from 'openai'
import { geocodePlace } from '@/services/remote/google/geocodeService'

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
  lat?: number | null
  lng?: number | null
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
              [
                'Eres un planificador experto de viajes para una app llamada GroupTrip.',
                'Devuelve SOLO un objeto JSON válido, sin markdown ni texto adicional.',
                'El JSON debe tener estas claves exactas: destino (string), presupuesto (number), duracionDias (integer >= 1), fechaInicio (YYYY-MM-DD, opcional), fechaFin (YYYY-MM-DD, opcional), nombre (string), descripcion (string), urlPortada (string URL opcional).',
                'Responde en español.',
                'Nunca uses textos genéricos como "Viaje personalizado" o "Viaje generado con IA". Si el usuario da poca información, infiere una propuesta realista y específica del destino.',
                'El nombre debe sonar natural y concreto, por ejemplo "Aventura cultural por Paraguay" o "Escapada a Asunción y alrededores".',
                'La descripción debe tener 1 o 2 frases útiles, mencionando experiencias plausibles del destino, ritmo del viaje y tipo de plan.',
                'El presupuesto debe ser una estimación realista en euros para un viaje económico/medio si no se indica otra cosa.',
                'Si el prompt usa fechas relativas como "próximo mes", "next month" o un mes específico, conviértelas a fechas exactas usando la fecha actual proporcionada. Para "próximo mes", usa el mes completo.',
                'Para urlPortada usa una URL segura de Unsplash Source con este formato: https://source.unsplash.com/1200x800/?DESTINO,travel. Reemplaza DESTINO por el destino principal sin espacios extraños.',
                'Ejemplo para "viaje a paraguay el próximo mes": {"destino":"Paraguay","presupuesto":1400,"duracionDias":30,"fechaInicio":"2026-06-01","fechaFin":"2026-06-30","nombre":"Aventura cultural por Paraguay","descripcion":"Recorrido por Paraguay combinando Asunción, cultura local, gastronomía y escapadas de naturaleza. Ideal para un viaje de ritmo medio con margen para descubrir ciudades, mercados y paisajes cercanos.","urlPortada":"https://source.unsplash.com/1200x800/?Paraguay,travel"}'
              ].join(' ')
          },
          {
            role: 'user',
            content: `Fecha actual: ${today}. Crea campos de formulario para este viaje: ${prompt}`
          }
        ],
        temperature: 0.35
      })

      const rawContent = response.choices[0]?.message?.content ?? '{}'
      const parsed = this.extractJsonObject(rawContent)
      const destino = this.asNonEmptyString(parsed.destino, this.inferDestinationFromPrompt(prompt))
      const nombre = this.sanitizeTripName(
        this.asNonEmptyString(parsed.nombre, ''),
        destino
      )
      const descripcion = this.sanitizeTripDescription(
        this.asNonEmptyString(parsed.descripcion, ''),
        destino
      )

      return {
        destino,
        presupuesto: this.asPositiveNumber(parsed.presupuesto, 1000),
        duracionDias: Math.max(1, Math.round(this.asPositiveNumber(parsed.duracionDias, 5))),
        fechaInicio: this.asValidDateString(parsed.fechaInicio),
        fechaFin: this.asValidDateString(parsed.fechaFin),
        nombre,
        descripcion,
        urlPortada: this.asReasonableImageUrl(parsed.urlPortada) ?? this.buildDestinationImageUrl(destino)
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

      for (const event of events) {
          if (event.lugar) {
            const coords = await geocodePlace(`${event.lugar}, ${project.destino}`)
            event.lat = coords?.lat ?? null
            event.lng = coords?.lng ?? null
          }
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

  private inferDestinationFromPrompt(prompt: string): string {
    const normalized = prompt.trim()
    const match = normalized.match(/\b(?:a|al|hacia|para|en)\s+([a-záéíóúüñ\s]+?)(?:\s+(?:el|la|los|las|este|esta|próximo|proximo|siguiente|en|con|por|durante)\b|$)/i)
    const destination = match?.[1]?.trim() || normalized || 'Destino sugerido'

    return destination
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toLocaleUpperCase('es-ES') + word.slice(1).toLocaleLowerCase('es-ES'))
      .join(' ')
  }

  private sanitizeTripName(value: string, destino: string): string {
    const genericNames = new Set([
      '',
      'viaje personalizado',
      'viaje generado con ia',
      'mi viaje',
      'nuevo viaje'
    ])

    const normalized = value.trim().toLocaleLowerCase('es-ES')
    if (genericNames.has(normalized)) {
      return `Aventura por ${destino}`
    }

    return value.trim()
  }

  private sanitizeTripDescription(value: string, destino: string): string {
    const normalized = value.trim().toLocaleLowerCase('es-ES')
    const genericDescriptions = new Set([
      '',
      'viaje generado con ia',
      'descripción del viaje',
      'viaje personalizado'
    ])

    if (genericDescriptions.has(normalized)) {
      return `Viaje por ${destino} con una mezcla de cultura local, gastronomía y visitas relajadas. Pensado para descubrir el destino con tiempo suficiente para ajustar actividades con el grupo.`
    }

    return value.trim()
  }

  private buildDestinationImageUrl(destino: string): string {
    const query = encodeURIComponent(`${destino}, travel`)
    return `https://source.unsplash.com/1200x800/?${query}`
  }
}

export default new OpenAIService()
