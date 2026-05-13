<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { authService } from '@/services/remote/firebase/authService'
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'

const router = useRouter()
const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

const form = reactive({
  name: '',
  email: '',
  password: ''
})

const rules = {
  required: (value: string) => !!value || 'Campo obligatorio',
  email: (value: string) => /.+@.+\..+/.test(value) || 'Introduce un correo válido',
  password: (value: string) => value.length >= 8 || 'Mínimo 8 caracteres',
}

const handleRegister = async () => {
  errorMessage.value = ''
  if (!form.name || !form.email || form.password.length < 8) {
    errorMessage.value = 'Completa los datos requeridos antes de continuar.'
    return
  }

  loading.value = true
  try {
    await authService.register({
      email: form.email,
      password: form.password,
      displayName: form.name,
      photoURL: ''
    })
    router.push('/dashboard')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta.'
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-app>
    <NavBar />
    <v-main class="gt-page auth-main">
      <v-container class="auth-wrapper">
        <v-card class="gt-card auth-card" elevation="0">
          <div class="auth-intro">
            <p class="gt-kicker">Crea tu cuenta</p>
            <h1 class="gt-title">Empieza tu próximo viaje</h1>
            <p class="gt-muted">Guarda proyectos, comparte enlaces y organiza actividades con tu grupo.</p>
          </div>

          <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-5">
            {{ errorMessage }}
          </v-alert>

          <v-form @submit.prevent="handleRegister">
            <v-text-field
              v-model="form.name"
              label="Nombre completo"
              placeholder="Juan Pérez"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-outline"
              :rules="[rules.required]"
              class="mb-3"
            />

            <v-text-field
              v-model="form.email"
              label="Correo electrónico"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-email-outline"
              :rules="[rules.required, rules.email]"
              class="mb-3"
            />

            <v-text-field
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              label="Contraseña"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :rules="[rules.required, rules.password]"
              @click:append-inner="showPassword = !showPassword"
            />

            <v-btn
              type="submit"
              block
              size="large"
              class="gt-primary-btn mt-4"
              :loading="loading"
            >
              Crear cuenta
            </v-btn>
          </v-form>

          <p class="auth-switch">
            ¿Ya tienes cuenta?
            <RouterLink to="/login">Inicia sesión</RouterLink>
          </p>
        </v-card>
      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
</template>

<style scoped>
.auth-wrapper {
  min-height: calc(100vh - 76px);
  display: grid;
  place-items: center;
  padding-block: 4rem;
}

.auth-card {
  width: min(100%, 480px);
  padding: clamp(1.4rem, 4vw, 2.2rem);
}

.auth-intro {
  margin-bottom: 1.5rem;
}

.auth-intro h1 {
  margin: 0.25rem 0 0.65rem;
  font-size: clamp(2rem, 5vw, 3rem);
}

.auth-switch {
  margin-top: 1.5rem;
  color: var(--gt-muted);
  text-align: center;
}

.auth-switch a {
  margin-left: 0.35rem;
  color: var(--gt-primary-dark);
  font-weight: 800;
}
</style>
