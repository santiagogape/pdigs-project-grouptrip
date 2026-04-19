export interface GeocodedPlace {
  lat: number
  lng: number
  formattedAddress?: string
}

export async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey || !query.trim()) {
    return null
  }

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  if (!data.results?.length) {
    return null
  }

  const first = data.results[0]

  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formattedAddress: first.formatted_address,
  }
}
