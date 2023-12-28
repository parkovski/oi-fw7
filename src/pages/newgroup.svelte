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
  import Select from 'svelte-select';
  import userService from '../services/user';
  import groupService from '../services/group';

  export let f7router;

  let items = [];
  let value;
  let name;
  let isPublic;

  const htmlElement = document.querySelector('html');
  let isDarkMode = htmlElement.classList.contains('dark');

  onMount(() => {
    userService.getContacts().subscribe(data =>
      items = data.contacts.map(c => ({ value: c.id, label: c.name }))
    );
    const observer = new MutationObserver(list => {
      for (let mutation of list) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          isDarkMode = mutation.target.classList.contains('dark');
        }
      }
    });
    observer.observe(htmlElement, { attributes: true });

    return () => {
      observer.disconnect();
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
  :global(.select-contacts) {
    background-color: var(--f7-text-editor-bg-color) !important;
    color: var(--f7-text-color);
  }
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
    <Select {items} class="select-contacts" searchable multiple
      bind:value
      placeholder="Select contacts"
      --list-background="var(--f7-text-editor-bg-color)"
      --item-color="var(--f7-text-color)"
      --item-hover-bg="#888"
      --multi-item-bg={isDarkMode ? "#111" : undefined}
      --multi-item-clear-icon-color={isDarkMode ? "white" : undefined}
      --multi-item-outline={isDarkMode ? "1px solid #444" : undefined}
      --border={isDarkMode ? "1px solid #444" : undefined}
    />
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
