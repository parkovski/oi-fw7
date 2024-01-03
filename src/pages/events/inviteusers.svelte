<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../../components/select.svelte';
  import userService from '../../services/user';
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
    eventService.invite(f7route.params.id, value.map(v => v.value));
    f7router.back();
  }

  onMount(() => {
    Promise.all([
      userService.getContacts().get(),
      eventService.getEvent(f7route.params.id).get(),
    ]).then(([contacts, event]) => {
      title = event.title;
      const eventUsers = new Set(event.members.map(m => m.id));
      items = contacts.contacts.filter(c => !eventUsers.has(c.id)).map(c => ({
        value: c.id,
        label: c.name,
      }));
    });
  });
</script>

<Page>
  <Navbar title="{title} - Invite" backLink="Back" />
  <Block style="margin: 2em 0">
    <div class="title">Invite contacts:</div>
    <Select {items} searchable multiple bind:value placeholder="Select contacts" />
  </Block>
  <Block style="margin: 2em 0; z-index: 0">
    <Button onClick={invite}>Invite</Button>
  </Block>
</Page>
