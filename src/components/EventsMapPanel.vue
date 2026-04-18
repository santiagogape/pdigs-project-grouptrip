<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { loadGoogleMaps } from '@/services/GoogleMapsServices'
import type { Evento } from '@/interfaces/models'

const props = defineProps<{
  events: Evento[]
}>()

const mapRef = ref<HTMLDivElement | null>(null)

let map: google.maps.Map | null = null
let directionsRenderer: google.maps.DirectionsRenderer | null = null
let markers: google.maps.marker.AdvancedMarkerElement[] = []

const formatHora = (ts?: number) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'

const clearMarkers = () => {
  markers.forEach((marker) => {
    marker.map = null
  })
  markers = []
}

const buildMap = async () => {
  await loadGoogleMaps()
  await google.maps.importLibrary('marker')

  if (!mapRef.value || !props.events.length) return

  const first = props.events[0]
  if (first.lat == null || first.lng == null) return

  map = new google.maps.Map(mapRef.value, {
    center: { lat: first.lat, lng: first.lng },
    zoom: 12,
    mapId: 'DEMO_MAP_ID',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  })

  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true,
    preserveViewport: false,
  })

  directionsRenderer.setMap(map)

  await drawRouteAndMarkers()
}

const drawRouteAndMarkers = async () => {
  if (!map || !props.events.length) return

  clearMarkers()

  const { AdvancedMarkerElement } =
    (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary

  const validEvents = props.events.filter((ev) => ev.lat != null && ev.lng != null)

  if (!validEvents.length) return

  validEvents.forEach((ev, index) => {
    const markerContent = document.createElement('div')
    markerContent.className = 'event-marker'
    markerContent.textContent = String(index + 1)

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: ev.lat!, lng: ev.lng! },
      title: `${index + 1}. ${ev.nombre}`,
      content: markerContent,
    })

    markers.push(marker)
  })

  if (validEvents.length === 1) {
    map.setCenter({ lat: validEvents[0].lat!, lng: validEvents[0].lng! })
    map.setZoom(15)
    return
  }

  const directionsService = new google.maps.DirectionsService()

  const origin = {
    lat: validEvents[0].lat!,
    lng: validEvents[0].lng!,
  }

  const destination = {
    lat: validEvents[validEvents.length - 1].lat!,
    lng: validEvents[validEvents.length - 1].lng!,
  }

  const waypoints = validEvents.slice(1, -1).map((ev) => ({
    location: { lat: ev.lat!, lng: ev.lng! },
    stopover: true,
  }))

  directionsService.route(
    {
      origin,
      destination,
      waypoints,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.WALKING,
    },
    (result, status) => {
      if (status === 'OK' && result && directionsRenderer) {
        directionsRenderer.setDirections(result)
      } else {
        console.error('No se pudo calcular la ruta:', status)
      }
    }
  )
}

watch(
  () => props.events,
  async () => {
    await nextTick()
    await buildMap()
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div class="map-layout">
    <aside class="events-sidebar">
      <div class="sidebar-title">Ruta de actividades</div>

      <div
        v-for="(ev, index) in events"
        :key="ev.id || `${ev.nombre}-${index}`"
        class="event-item"
      >
        <div class="event-order">{{ index + 1 }}</div>

        <div class="event-info">
          <div class="event-name">{{ ev.nombre }}</div>
          <div class="event-time">
            {{ formatHora(ev.fechaHoraInicio) }} - {{ formatHora(ev.fechaHoraFin) }}
          </div>
          <div v-if="ev.lugar" class="event-place">
            {{ ev.lugar }}
          </div>
        </div>
      </div>
    </aside>

    <div ref="mapRef" class="map-panel"></div>
  </div>
</template>

<style scoped>
.map-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  min-height: 520px;
}

.events-sidebar {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  overflow-y: auto;
  background: #fff;
}

.sidebar-title {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 14px;
  color: #1f2937;
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  margin-bottom: 10px;
}

.event-order {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
}

.event-info {
  min-width: 0;
}

.event-name {
  font-weight: 700;
  color: #111827;
}

.event-time,
.event-place {
  font-size: 0.85rem;
  color: #6b7280;
}

.map-panel {
  width: 100%;
  min-height: 520px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

:global(.event-marker) {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border: 2px solid white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

@media (max-width: 960px) {
  .map-layout {
    grid-template-columns: 1fr;
  }

  .events-sidebar {
    max-height: 240px;
  }
}
</style>
