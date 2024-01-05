<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  export let f7route;
</script>

<Page>
  <Navbar title="View group event" backLink="Back" />
  <p>Event {f7route.params.id}</p>
  <p>Nothing to see here...</p>
</Page>
