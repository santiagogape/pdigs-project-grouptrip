<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { authService } from '@/services/remote/firebase/authService'
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

const form = reactive({
  email: '',
  password: ''
})

const rules = {
  required: (value: string) => !!value || 'Campo obligatorio',
  email: (value: string) => /.+@.+\..+/.test(value) || 'Introduce un correo válido',
}

const handleLogin = async () => {
  errorMessage.value = ''
  if (!form.email || !form.password) {
    errorMessage.value = 'Completa el correo y la contraseña.'
    return
  }

  loading.value = true
  try {
    await authService.login(form.email, form.password)
    const redirect = route.query.redirect as string | undefined
    router.push(redirect?.startsWith('/') ? redirect : '/dashboard')
  } catch (error: any) {
    errorMessage.value = error?.code === 'auth/invalid-credential'
      ? 'Correo o contraseña incorrectos.'
      : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
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
            <p class="gt-kicker">Bienvenido de nuevo</p>
            <h1 class="gt-title">Entra a tus viajes</h1>
            <p class="gt-muted">Continúa organizando planes, actividades y rutas con tu grupo.</p>
          </div>

          <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-5">
            {{ errorMessage }}
          </v-alert>

          <v-form @submit.prevent="handleLogin">
            <v-text-field
              v-model="form.email"
              label="Correo electrónico"
              placeholder="ejemplo@correo.com"
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
              placeholder="Tu contraseña"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :rules="[rules.required]"
              @click:append-inner="showPassword = !showPassword"
            />

            <v-btn
              type="submit"
              block
              size="large"
              class="gt-primary-btn mt-4"
              :loading="loading"
            >
              Entrar ahora
            </v-btn>
          </v-form>

          <p class="auth-switch">
            ¿Aún no tienes cuenta?
            <RouterLink to="/register">Regístrate</RouterLink>
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
  width: min(100%, 460px);
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
