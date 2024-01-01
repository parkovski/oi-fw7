<script>
  import {
    Page,
    Navbar,
    List,
    ListInput,
    ListItem,
    ListButton,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../../components/select.svelte';
  import userService from '../../services/user';
  import groupService from '../../services/group';

  export let f7router;

  let items = [];
  let value;
  let name;
  let isPublic;

  let validationErrorName = null;

  onMount(() => {
    const contactSubscription = userService.getContacts().subscribe(data =>
      items = data.contacts.map(c => ({ value: c.id, label: c.name }))
    );
    return () => {
      contactSubscription.unsubscribe();
    };
  });

  function validateInputs() {
    if (!name || !name.length) {
      validationErrorName = 'Name cannot be empty';
      return false;
    } else if (name.length > 255) {
      validationErrorName = 'Name is too long';
      return false;
    } else {
      validationErrorName = null;
      return true;
    }
  }

  async function onCreate() {
    if (!validateInputs()) {
      return;
    }
    const invited = value && value.map(v => v.value);
    const gid = await groupService.newGroup(name.trim(), invited, isPublic);
    f7router.navigate(`/groups/view/${gid}/`);
  }
</script>

<Page>
  <Navbar title="New Group" backLink="Back" />
  <List form style="margin-top: .5em">
    <ListInput type="text" name="group-name" placeholder="Group name" bind:value={name} />
    {#if validationErrorName}
      <ListItem style="color: var(--f7-color-red)">
        {validationErrorName}
      </ListItem>
    {/if}
    <ListItem>
      <Select {items} searchable multiple bind:value placeholder="Select contacts" />
    </ListItem>
    <ListItem checkbox bind:checked={isPublic}>
      Public group?
    </ListItem>
    <ListButton onClick={onCreate}>Create</ListButton>
  </List>
</Page>
