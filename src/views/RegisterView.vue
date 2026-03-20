<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '@/services/remote/firebase/authService';
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';

const router = useRouter();
const loading = ref(false);

const form = reactive({
  name: '',
  email: '',
  password: ''
});

const handleRegister = async () => {
  if (!form.email || !form.password || !form.name) return;
  loading.value = true;
  try {
    await authService.register({
      email: form.email,
      password: form.password,
      displayName: form.name,
      photoURL: ''
    });
    router.push('/dashboard');
  } catch (error: unknown) {
    alert("Error: " + (error as Error).message);
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
              <h1 class="auth-title">Crea tu cuenta</h1>
              <p class="auth-subtitle">Únete a miles de viajeros hoy</p>
            </div>
            <v-card class="auth-card" elevation="0">
              <v-form @submit.prevent="handleRegister" class="pa-8">

                <div class="mb-5">
                  <label class="input-label">Nombre Completo</label>
                  <v-text-field
                    v-model="form.name"
                    placeholder="Juan Pérez"
                    variant="outlined"
                    density="comfortable"
                    class="custom-field"
                    prepend-inner-icon="mdi-account-outline"
                    hide-details
                  ></v-text-field>
                </div>

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

                <div class="mb-8">
                  <label class="input-label">Contraseña</label>
                  <v-text-field
                    v-model="form.password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    variant="outlined"
                    density="comfortable"
                    class="custom-field"
                    prepend-inner-icon="mdi-lock-outline"
                    hide-details
                  ></v-text-field>
                </div>

                <v-btn
                  type="submit"
                  block
                  size="x-large"
                  elevation="0"
                  class="submit-btn button"
                  :loading="loading"
                >
                  Comenzar Aventura
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-form>

              <div class="auth-card-footer">
                <p class="mb-0">
                  ¿Ya tienes cuenta?
                  <RouterLink to="/login" class="login-link">Inicia sesión</RouterLink>
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

.button {
  margin-top: 1rem;
}

/* Colores basados en tu footer */
.auth-main {
  background-color: #ebebeb; /* Fondo similar al footer-cta */
}

.auth-wrapper {
  min-height: calc(100vh - 92px); /* Ajuste por altura del navbar */
  padding: 4rem 1rem;
}

/* Títulos con el estilo del CTA */
.auth-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  line-height: 1.1;
  color: black;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  font-size: 1.1rem;
  color: rgba(0, 0, 0, 0.45);
}

/* Card con estilo "papel" */
.auth-card {
  background-color: white !important; /* Fondo beige del footer-bottom */
  border: 2px solid black !important; /* Borde marcado para estilo audaz */
  border-radius: 20px !important;
  overflow: hidden;
}

/* Labels */
.input-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: black;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Inputs personalizados */
.custom-field :deep(.v-field) {
  background: white !important;
  border-radius: 12px !important;
  border: 2px solid rgba(0,0,0,0.1) !important;
}

.custom-field :deep(.v-field--focused) {
  border-color: var(--color-orange) !important;
}

/* Botón estilo footer-cta */
.submit-btn {
  background-color: var(--color-orange) !important;
  color: black !important;
  font-weight: 800 !important;
  text-transform: none !important;
  font-size: 1.1rem !important;
  height: 64px !important;
  border-radius: 12px !important;
  transition: transform 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-3px);
}

/* Footer de la card */
.auth-card-footer {
  background-color: rgba(0,0,0,0.05);
  padding: 1.5rem;
  text-align: center;
  border-top: 2px solid rgba(0,0,0,0.05);
  color: rgba(0, 0, 0, 0.6);
}

.login-link {
  color: var(--color-orange);
  font-weight: 800;
  text-decoration: none;
  margin-left: 5px;
}

/* Decoración superior estilo footer-top */
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

@media (max-width: 600px) {
  .auth-title {
    font-size: 2.2rem;
  }
}

/* Color del texto que escribe el usuario */
.custom-field :deep(input) {
  color: #000000 !important;
  opacity: 1 !important;
}

/* Color del texto del placeholder (el texto de sugerencia) */
.custom-field :deep(input::placeholder) {
  color: rgba(0, 0, 0, 0.5) !important;
  opacity: 1 !important;
}

/* Color de los iconos (mdi-account, mdi-email, etc) */
.custom-field :deep(.v-icon) {
  color: rgba(0, 0, 0, 0.6) !important;
}
</style>
