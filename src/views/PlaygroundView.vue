<script setup lang="ts">
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'
import NewProjectForm from '@/components/NewProjectForm.vue'
</script>

<template>
  <v-app>
    <NavBar />
    <v-main>
      <v-container class="mt-5" fluid>
        <NewProjectForm />
      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
</template>