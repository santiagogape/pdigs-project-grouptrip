<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { authService } from '@/services/remote/firebase/authService';
import { projectService } from '@/services/remote/firebase/projectService';
const route = useRoute();
const router = useRouter();



onMounted(() => {
  const isLoggedIn = () => {
  return authService.getCurrentUser() !== null;
};
  const token = route.params.token as string;

  if (!token) {
    console.error('Token undefined');
    router.push('/dashboard');
    return;
  }

  if (!isLoggedIn()) {
    router.push({
      path: '/login',
      query: {
        redirect: route.fullPath
      }
    });
  } else {
    projectService.addUserToProject(token, authService.getCurrentUser()!.uid)
      .then(() => {
        console.log('Usuario añadido al proyecto');
      })
      .catch((error) => {
        console.error('Error añadiendo usuario al proyecto:', error);
      });
    router.push(`/proyecto/${token}`);

  }
});

</script>
