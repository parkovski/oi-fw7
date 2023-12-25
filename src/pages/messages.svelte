<script>
  import {
    Page,
    Navbar,
    useStore,
  } from 'framework7-svelte';
  import MessagesView from '../components/messages.svelte';
  import { onMount } from 'svelte';
  import chatService from '../services/chat';

  let messages = [];

  onMount(() => {
    chatService.observeChatSummary().subscribe(chat => {
      messages = [chat, ...messages];
    });
  });
</script>
<Page>
  <Navbar title="Messages" />
  <MessagesView messages={messages} />
</Page>
