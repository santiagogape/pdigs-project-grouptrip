<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { authService } from '@/services/remote/firebase/authService';
const route = useRoute();
const router = useRouter();
const token = route.params.token as string;
const isLoggedIn = () => {
  return authService.getCurrentUser() !== null;
};

if (!isLoggedIn()) {
  router.push({
    path: '/login',
    query: {
      redirect: route.fullPath
    }
  });
}else {
  //TODO
  //Falta agregar usuario al proyecto!!
  router.push(`/proyecto/${token}`);
}

</script>
