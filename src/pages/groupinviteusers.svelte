<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../components/select.svelte';
  import groupService from '../services/group';
  import userService from '../services/user';

  export let f7route;
  export let f7router;

  let items = [];
  let value;
  let groupName;

  onMount(() => {
    userService.getContacts().ensureLoaded().then(contacts => {
      groupService.getGroup(f7route.params.id).ensureLoaded().then(group => {
        groupName = group.name;
        const groupUsers = new Set(group.members.map(m => m.id));
        items = contacts.contacts.filter(c => !groupUsers.has(c.id)).map(c => ({
          value: c.id,
          label: c.name
        }));
      });
    });
  });

  async function invite() {
    if (!value || !value.length) {
      return;
    }
    await groupService.inviteToGroup(f7route.params.id, value.map(v => v.value));
    f7router.back();
  }
</script>

<style>
  .title {
    padding-bottom: .5em;
  }
</style>

<Page>
  <Navbar title="{groupName} - Invite" backLink="Back" />
  <Block style="margin: 2em 0">
    <div class="title">Invite contacts:</div>
    <Select {items} searchable multiple bind:value placeholder="Select contacts" />
  </Block>
  <Block style="margin: 2em 0; z-index: 0">
    <Button onClick={invite}>Invite</Button>
  </Block>
</Page>
