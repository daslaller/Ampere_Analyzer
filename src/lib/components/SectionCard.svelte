<script lang="ts">
  export let title = '';
  export let description = '';
  export let tone: 'default' | 'accent' | 'soft' = 'default';
</script>

<section class={`section-card ${tone}`}>
  {#if title || description}
    <header class="section-header">
      {#if title}
        <h2>{title}</h2>
      {/if}
      {#if description}
        <p>{description}</p>
      {/if}
    </header>
  {/if}
  <div class="section-content">
    <slot />
  </div>
</section>
