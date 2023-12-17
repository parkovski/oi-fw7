<script>
  import {
    Page,
    Navbar,
    useStore,
  } from 'framework7-svelte';
  import MessagesView from '../components/messages.svelte';
  import MessagesService from '../services/messages';
  import { onMount } from 'svelte';

  let service;

  let messages = useStore('messages', value => messages = value);

  onMount(() => {
    service = new MessagesService();
  });
</script>
<Page>
  <Navbar title="Messages" />
  <MessagesView messages={messages} />
</Page>
