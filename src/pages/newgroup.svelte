<script>
  import {
    Page,
    Navbar,
    Block,
    Input,
    Button,
    Checkbox,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../components/select.svelte';
  import userService from '../services/user';
  import groupService from '../services/group';

  export let f7router;

  let items = [];
  let value;
  let name;
  let isPublic;

  onMount(() => {
    const contactSubscription = userService.getContacts().subscribe(data =>
      items = data.contacts.map(c => ({ value: c.id, label: c.name }))
    );
    return () => {
      contactSubscription.unsubscribe();
    };
  });

  async function onCreate() {
    if (!name || !name.trim().length) {
      return;
    }
    const invited = value && value.map(v => v.value);
    const gid = await groupService.newGroup(name.trim(), invited, isPublic);
    f7router.navigate(`/groups/view/${gid}/`);
  }
</script>

<style>
  .title {
    padding-bottom: .5em;
  }
</style>

<Page>
  <Navbar title="New Group" backLink="Back" />
  <Block style="margin: 2em 0">
    <div class="title">Group name:</div>
    <Input type="text" bind:value={name} placeholder="Group name" />
  </Block>
  <Block style="margin: 2em 0">
    <div class="title">Invite contacts:</div>
    <Select {items} searchable multiple bind:value placeholder="Select contacts" />
  </Block>
  <Block style="margin: 2em 0; z-index: 0">
    <label>
      <Checkbox bind:checked={isPublic} /> Public group
    </label>
  </Block>
  <Block style="margin: 2em 0; z-index: 0">
    <Button onClick={onCreate}>Create</Button>
  </Block>
</Page>
