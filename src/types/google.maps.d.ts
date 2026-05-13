declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: Record<string, unknown>)
      setCenter(position: LatLngLiteral): void
      setZoom(zoom: number): void
      fitBounds(bounds: unknown): void
      addListener(eventName: string, handler: (event: MapMouseEvent) => void): void
    }

    class DirectionsRenderer {
      constructor(options?: Record<string, unknown>)
      setMap(map: Map): void
      setDirections(result: DirectionsResult): void
    }

    class DirectionsService {
      route(
        request: Record<string, unknown>,
        callback: (result: DirectionsResult | null, status: string) => void
      ): void
    }

    class Geocoder {
      geocode(request: Record<string, unknown>): Promise<{
        results?: Array<{ formatted_address?: string }>
      }>
    }

    interface LatLngLiteral {
      lat: number
      lng: number
    }

    interface LatLng {
      lat(): number
      lng(): number
    }

    interface MapMouseEvent {
      latLng?: LatLng | null
    }

    interface DirectionsResult {}

    enum TravelMode {
      WALKING = 'WALKING',
    }

    function importLibrary(name: 'marker'): Promise<MarkerLibrary>
    function importLibrary(name: 'places'): Promise<PlacesLibrary>
    function importLibrary(name: string): Promise<unknown>

    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: Record<string, unknown>)
        map: Map | null
        position?: LatLngLiteral | LatLng | null
        addListener(eventName: string, handler: () => void): void
      }
    }

    interface MarkerLibrary {
      AdvancedMarkerElement: typeof marker.AdvancedMarkerElement
    }

    class PlaceAutocompleteElement extends HTMLElement {
      constructor(options?: Record<string, unknown>)
    }

    interface PlacesLibrary {
      PlaceAutocompleteElement: typeof PlaceAutocompleteElement
    }
  }
}
