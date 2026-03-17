import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import App from './App.vue'
import router from './router'
import { vuetify } from './plugings/vuetify'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
