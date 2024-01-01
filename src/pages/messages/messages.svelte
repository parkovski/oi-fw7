<script>
  import {
    Page,
    Navbar,
    Fab,
    Icon,
    useStore,
  } from 'framework7-svelte';
  import MessagesView from '../../components/messages.svelte';
  import { onMount } from 'svelte';
  import chatService from '../../services/chat';

  let messages = [];

  onMount(() => {
    chatService.observeChatSummary().subscribe(chat => {
      messages = [chat, ...messages];
    });
  });
</script>
<Page>
  <Navbar title="Messages" />
  <Fab position="right-bottom" href="/messages/new/">
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  <MessagesView messages={messages} />
</Page>
