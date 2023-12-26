<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  import { onMount } from 'svelte';
  import cookie from 'cookie';
  import chatService from '../services/chat';
  import ChatView from '../components/chat.svelte';

  export let f7route;

  let chats = [];
  let pendingChats = [];

  function onSend(text) {
    const pending = chatService.send({
      to: f7route.params.id,
      text,
    });
    pendingChats = [...pendingChats, pending];
  }

  onMount(() => {
    const myUid = cookie.parse(document.cookie)?.uid || '0';

    chatService.getChat(f7route.params.id).then(cs => {
      chats = cs.map(c => ({
        id: c.id,
        to: c.uid_from === myUid ? c.uid_from : undefined,
        from: c.uid_from === myUid ? undefined : c.uid_from,
        text: c.message,
      }));
    });

    chatService.observeMessageSent().subscribe(msg => {
      const chat = pendingChats.find(pend => pend.uuid === msg.uuid);
      if (chat) {
        pendingChats = pendingChats.filter(pend => pend.uuid !== msg.uuid);
        chats = [...chats, {
          id: msg.id,
          to: msg.to,
          text: msg.text,
        }];
      }
    });

    chatService.observeMessageReceived().subscribe(msg => {
      if (msg.from !== myUid) {
        chats = [...chats, {
          id: msg.id,
          from: msg.from,
          text: msg.text,
        }];
      }
    });
  });
</script>

<Page>
  <Navbar title="Messages" backLink="Back" />
  <div style="height: 100%">
    <ChatView {chats} {pendingChats} {onSend} />
  </div>
</Page>
