<script>
  import {
    Page,
    Navbar,
    Block,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import eventService from '../../services/event';

  export let f7route;

  let event = { loading: true };

  onMount(() => {
    const eventSubscription =
      eventService.getEvent(f7route.params.id).subscribe(e => event = e);

    return () => {
      eventSubscription.unsubscribe();
    };
  });
</script>

<Page>
  <Navbar title={event.title} backLink="Back" />
  {#if event.loading}
    <Block>
      Loading...
    </Block>
  {:else}
    <Block>{event.description}</Block>
  {/if}
</Page>
