<script>
  import {
    Page,
    Navbar,
    Fab,
    Icon,
  } from 'framework7-svelte';
  import Messages from '../../components/messages.svelte';
  import { onMount } from 'svelte';
  import { onLogin } from '../../js/onlogin';
  import chatService from '../../services/chat';

  let messages = [];

  async function onRefresh(done) {
    await chatService.getChatSummary().refresh();
    done();
  }

  onMount(() => {
    let chatSubscription;
    onLogin(() => {
      chatSubscription = chatService.getChatSummary().subscribe(chat => {
        messages = chat;
      });
    });

    return () => {
      chatSubscription && chatSubscription.unsubscribe();
    };
  });
</script>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar title="Messages" />
  <Fab position="right-bottom" href="/messages/new/">
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  <Messages messages={messages} />
</Page>
