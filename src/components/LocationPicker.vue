<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { loadGoogleMaps } from "@/services/GoogleMapsServices";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", payload: { lat: number; lng: number; name?: string }): void;
}>();

// Refs de elementos
const mapRef = ref<HTMLDivElement | null>(null);
const autocompleteContainer = ref<HTMLDivElement | null>(null);

// Variables de estado (pueden ser reactive si necesitas mostrarlas en el HTML)
let map: google.maps.Map;
let marker: any = null; // AdvancedMarkerElement
let selectedPosition = { lat: 28.1235, lng: -15.4363 };
let selectedName = "";

// Observar apertura del modal
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      await nextTick();
      await initMap();
    }
  }
);

/**
 * INICIALIZAR MAPA
 */
const initMap = async () => {
  await loadGoogleMaps();

  if (!mapRef.value) return;

  // 1. Crear el Mapa (Requiere MapId para Advanced Markers)
  map = new google.maps.Map(mapRef.value, {
    center: selectedPosition,
    zoom: 14,
    mapId: "DEMO_MAP_ID", // Cambia por tu ID real en producción
    mapTypeControl: false,
    streetViewControl: false,
  });

  // 2. Crear el Marcador moderno
  const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

  marker = new AdvancedMarkerElement({
    map,
    position: selectedPosition,
    gmpDraggable: true,
  });

  // Actualizar coordenadas si el usuario arrastra el marcador
  marker.addListener("dragend", () => {
  const pos = marker.position;
  if (!pos) return;

  selectedPosition = {
    lat: typeof pos.lat === "function" ? pos.lat() : pos.lat,
    lng: typeof pos.lng === "function" ? pos.lng() : pos.lng,
  };

  selectedName = "Ubicación seleccionada manualmente";
  });

  map.addListener("click", async (event: google.maps.MapMouseEvent) => {
  if (!event.latLng) return;

  const position = {
    lat: event.latLng.lat(),
    lng: event.latLng.lng(),
  };

  selectedPosition = position;

  if (marker) {
    marker.position = position;
  }

  const geocoder = new google.maps.Geocoder();

  try {
    const response = await geocoder.geocode({ location: position });
    selectedName =
      response.results?.[0]?.formatted_address ||
      "Ubicación seleccionada manualmente";
  } catch (error) {
    console.error("Error obteniendo dirección:", error);
    selectedName = "Ubicación seleccionada manualmente";
  }

  console.log("Click en mapa:", selectedPosition, selectedName);
  });

  initAutocomplete();
};

/**
 * INICIALIZAR BUSCADOR (Place Autocomplete Web Component)
 */
const initAutocomplete = async () => {
  if (!autocompleteContainer.value) return;

  const { PlaceAutocompleteElement } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;

  const autocomplete = new PlaceAutocompleteElement({
    placeholder: "Busca un lugar, calle o establecimiento...",
  });

  // Estilo para que parezca la barra de búsqueda nativa
  autocomplete.classList.add("google-search-bar");

  // Evento de selección
  // Escuchamos el evento de selección
  autocomplete.addEventListener("gmp-select", async (event: any) => {
    const placePrediction = event.placePrediction;
    if (!placePrediction) return;

    const place = placePrediction.toPlace();

    await place.fetchFields({
      fields: ["location", "displayName", "formattedAddress", "viewport"],
    });

    if (!place.location) return;

    const position = {
      lat: place.location.lat(),
      lng: place.location.lng(),
    };

    selectedPosition = position;
    selectedName = place.displayName || "";

    if (place.viewport) {
      map.fitBounds(place.viewport);
    } else {
      map.setCenter(position);
      map.setZoom(17);
    }

    if (marker) {
      marker.position = position;
    }
  });

  // Limpiar y añadir al DOM
  autocompleteContainer.value.innerHTML = "";
  autocompleteContainer.value.appendChild(autocomplete);
};

const confirmLocation = () => {
  emit("confirm", {
    lat: selectedPosition.lat,
    lng: selectedPosition.lng,
    name: selectedName,
  });
};
</script>

<template>
  <teleport to="body">
    <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-container">

        <div class="modal-header">
          <h3>Seleccionar ubicación</h3>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div ref="autocompleteContainer" class="autocomplete-wrapper"></div>

        <div ref="mapRef" class="map-canvas"></div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="emit('close')">Cancelar</button>
          <button class="btn-save" @click="confirmLocation">Guardar ubicación</button>
        </div>

      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-container {
  width: 90%;
  max-width: 700px;
  height: 80vh;
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  border: none;
  background: #eee;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover { background: #ddd; }

/* Wrapper del buscador para darle espacio */
.autocomplete-wrapper {
  margin-bottom: 15px;
}

/* IMPORTANTE: Estilizar el componente de Google */
.autocomplete-wrapper :deep(gmpx-place-autocomplete) {
  width: 100%;
}

/* Forzar el input interno para que se vea como una barra de búsqueda */
.autocomplete-wrapper :deep(input) {
  width: 100%;
  height: 45px;
  padding: 0 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  outline: none;
}

.autocomplete-wrapper :deep(input:focus) {
  border-color: #4285F4;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
}

.map-canvas {
  flex-grow: 1; /* Ocupa el espacio restante */
  width: 100%;
  border-radius: 12px;
  border: 1px solid #eee;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel {
  padding: 10px 20px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-save {
  padding: 10px 25px;
  border: none;
  background: #4285F4;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-save:hover { background: #357abd; }

/* Esto apunta directamente a las variables internas del Web Component */
.autocomplete-wrapper :deep(gmpx-place-autocomplete),
.autocomplete-wrapper :deep(gmp-place-autocomplete) {
  /* Variables de Google para el color de fondo y texto */
  --gmpx-color-surface: #ffffff;
  --gmpx-color-on-surface: #333333;

  /* Otras mejoras visuales */
  width: 100%;
  border-radius: 8px;
}

/* Forzar el input interno si las variables no son suficientes */
.autocomplete-wrapper :deep(input) {
  background-color: white !important;
  color: #333 !important;
  border: 1px solid #ddd !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}

/* Estilo para la lista de resultados (popover) */
:global(.pac-container) {
  background-color: white !important;
  z-index: 10000 !important; /* Para que salga por encima del modal */
}
</style>
