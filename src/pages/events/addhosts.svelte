<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../../components/select.svelte';
  import eventService from '../../services/event';

  export let f7route;
  export let f7router;

  let items = [];
  let value;
  let title;

  function invite() {
    if (!value || !value.length) {
      return;
    }
    eventService.addHosts(f7route.params.id, value.map(v => v.value));
    f7router.back();
  }

  onMount(() => {
    eventService.getEvent(f7route.params.id).get().then(event => {
      title = event.title;
      items = event.members.filter(m => m.kind === 2).map(m => ({
        value: m.id,
        label: m.name,
      }));
    });
  });
</script>

<Page>
  <Navbar title="{title} - Add hosts" backLink="Back" />
  <Block style="margin: 2em 0">
    <div class="title">Invite attendees:</div>
    <Select {items} searchable multiple bind:value placeholder="Select users" />
  </Block>
  <Block style="margin: 2em 0; z-index: 0">
    <Button onClick={invite}>Invite</Button>
  </Block>
</Page>
