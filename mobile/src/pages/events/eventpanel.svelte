<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Link,
    f7,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import eventService from '../../services/event';

  export let f7route;

  let event = {};

  function panelNavigate(to) {
    const eid = f7.views.events.router.currentRoute.params.id;
    f7.panel.close('#right-panel');
    f7.views.events.router.navigate(`${to}${eid}/`);
  }

  onMount(() => {
    const eventSubscription =
      eventService.getEvent(f7route.params.id).subscribe(value => event = value);

    return () => {
      eventSubscription.unsubscribe();
    };
  });
</script>

<Page>
  <Navbar title="Menu" />
  <List style="margin-top: 0">
    <ListItem>
      <Link text="Invite contacts" onClick={() => panelNavigate('/events/invite/')} />
    </ListItem>
    {#if event.kind === 3}
      <ListItem>
        <Link text="Add hosts" onClick={() => panelNavigate('/events/addhosts/')} />
      </ListItem>
    {/if}
  </List>
</Page>
