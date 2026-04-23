<script lang="ts">
  import { onMount } from 'svelte';
  import '@/app.css';
  import { historyStore } from '@/lib/stores/history';

  onMount(() => {
    historyStore.load();
  });
</script>

<slot />
