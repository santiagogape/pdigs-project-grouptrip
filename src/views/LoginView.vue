<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authService } from '@/services/remote/firebase/authService';
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const showPassword = ref(false);


const form = reactive({
  email: '',
  password: ''
});

const handleLogin = async () => {
  await router.isReady();
  if (!form.email || !form.password) return;
  loading.value = true;
  try {
    await authService.login(form.email, form.password);

    const redirect = route.query.redirect as string;

    if (redirect && redirect.startsWith('/')) {
      router.push(redirect);
    } else {
      router.push('/dashboard');
    }
    console.log('redirect:', route.query.redirect);
  } catch (error: any) {
    const message = error.code === 'auth/invalid-credential'
      ? "Correo o contraseña incorrectos."
      : "Error al iniciar sesión.";
    alert(message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-app>
    <NavBar />
    <v-main class="auth-main">
      <v-container class="auth-wrapper" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="5" lg="4">

            <div class="text-center mb-8 title-section">
              <div class="deco-dots mb-4">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <h1 class="auth-title">¡Hola de nuevo!</h1>
              <p class="auth-subtitle">Ingresa para continuar tu aventura</p>
            </div>

            <v-card class="auth-card" elevation="0">
              <v-form @submit.prevent="handleLogin" class="pa-8">

                <div class="mb-5">
                  <label class="input-label">Correo Electrónico</label>
                  <v-text-field
                    v-model="form.email"
                    placeholder="ejemplo@correo.com"
                    variant="outlined"
                    density="comfortable"
                    class="custom-field"
                    prepend-inner-icon="mdi-email-outline"
                    hide-details
                  ></v-text-field>
                </div>

                <div class="mb-4">
                  <div class="d-flex justify-space-between align-center mb-1">
                    <label class="input-label mb-0">Contraseña</label>
                    <a href="#" class="forgot-link">¿La olvidaste?</a>
                  </div>
                  <v-text-field
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Tu contraseña secreta"
                    variant="outlined"
                    density="comfortable"
                    class="custom-field"
                    prepend-inner-icon="mdi-lock-outline"
                    :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    @click:append-inner="showPassword = !showPassword"
                    hide-details
                  ></v-text-field>
                </div>

                <v-btn
                  type="submit"
                  block
                  size="x-large"
                  elevation="0"
                  class="submit-btn"
                  :loading="loading"
                >
                  Entrar ahora
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-form>

              <div class="auth-card-footer">
                <p class="mb-0">
                  ¿Aún no tienes cuenta?
                  <RouterLink to="/register" class="register-link">Regístrate</RouterLink>
                </p>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
</template>

<style scoped>
/* Estilos Base compartidos */
.auth-main {
  background-color: #ebebeb;
}

.auth-wrapper {
  min-height: calc(100vh - 92px);
  padding: 4rem 1rem;
}

.auth-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  line-height: 1.1;
  color: black;
}

.auth-subtitle {
  font-size: 1.1rem;
  color: rgba(0, 0, 0, 0.45);
}

/* Card con borde negro de 2px (coherencia con Navbar) */
.auth-card {
  background-color: white !important;
  border: 2px solid black !important;
  border-radius: 20px !important;
  overflow: hidden;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: black;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Inputs con texto forzado en negro */
.custom-field :deep(.v-field) {
  background: white !important;
  border-radius: 12px !important;
  border: 2px solid rgba(0,0,0,0.1) !important;
}

.custom-field :deep(.v-field--focused) {
  border-color: var(--color-orange) !important;
}

.custom-field :deep(input) {
  color: #000000 !important;
  opacity: 1 !important;
}

.custom-field :deep(input::placeholder) {
  color: rgba(0, 0, 0, 0.4) !important;
}

/* Botón Naranja Estilo CTA */
.submit-btn {
  background-color: var(--color-orange) !important;
  color: black !important;
  font-weight: 800 !important;
  text-transform: none !important;
  font-size: 1.1rem !important;
  height: 64px !important;
  border-radius: 12px !important;
  margin-top: 1.5rem;
  transition: transform 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-3px);
}

/* Links */
.forgot-link {
  font-size: 0.75rem;
  color: rgba(0,0,0,0.5);
  text-decoration: none;
  font-weight: 600;
}

.register-link {
  color: var(--color-orange);
  font-weight: 800;
  text-decoration: none;
  margin-left: 5px;
}

.auth-card-footer {
  background-color: rgba(0,0,0,0.05);
  padding: 1.5rem;
  text-align: center;
  border-top: 2px solid rgba(0,0,0,0.05);
  color: rgba(0, 0, 0, 0.6);
}

/* Decoración superior */
.deco-dots {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.dot {
  width: 40px;
  height: 8px;
  background-color: var(--color-orange);
  display: inline-block;
  border-radius: 4px;
}

.title-section {
  margin-bottom: 2rem;
  margin-top: 2rem;
}
</style>
