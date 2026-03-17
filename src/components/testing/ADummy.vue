<script setup lang="ts">
import { ref } from 'vue'

const isEnabled = ref(true)
const firstName = ref('')
const lastName = ref('')
const isAdmin = ref(false)
const role = ref()
</script>

<template>
  <v-sheet class="mx-auto" width="300">
    <v-checkbox color="red" v-model="isEnabled" label="Form is enabled"></v-checkbox>
    <v-form :disabled="!isEnabled">
      <v-text-field v-model="firstName" label="First name"></v-text-field>
      <v-text-field v-model="lastName" label="Last name"></v-text-field>
      <v-checkbox v-model="isAdmin" label="User is admin"></v-checkbox>
      <v-select
        v-model="role"
        :disabled="isAdmin || undefined"
        :items="['VIEWER', 'EDITOR']"
        hint="I'm enabled only if the user is not an admin"
        persistent-hint
      ></v-select>
    </v-form>
  </v-sheet>
</template>

<style lang="css" scoped></style>
