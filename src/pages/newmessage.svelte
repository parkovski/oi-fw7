<script>
  import {
    Page,
    Navbar,
    Block,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from 'svelte-select';
  import userService from '../services/user';
  import chatService from '../services/chat';
  import Chat from '../components/chat.svelte';

  export let f7router;

  let items = [];
  let value;

  onMount(() => {
    userService.getContacts().subscribe(data =>
      items = data.contacts.map(c => ({ value: c.id, label: c.name }))
    );
  });

  function onSend(text) {
    chatService.send({
      to: value.value,
      text,
    });
    f7router.navigate(`/messages/view/${value.value}/`);
  }
</script>

<style>
  :global(.select-contacts) {
    background-color: var(--f7-text-editor-bg-color) !important;
    color: var(--f7-text-color);
  }
  .title {
    padding: 2px;
    margin: 2px;
  }
  .chat-container {
    height: calc(100% - 80px);
  }
</style>

<Page>
  <Navbar title="New Message" backLink="Back" />
  <Block style="padding: 2px; margin: 2px">
    <div class="title">To:</div>
    <Select {items} class="select-contacts" searchable
      bind:value
      placeholder="Select a contact"
      --list-background="var(--f7-text-editor-bg-color)"
      --item-color="var(--f7-text-color)"
      --item-hover-bg="#888"
    />
  </Block>
  <div class="chat-container">
    <Chat chats={[]} pendingChats={[]} {onSend} />
  </div>
</Page>
