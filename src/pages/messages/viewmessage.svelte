<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  import { onMount } from 'svelte';
  import chatService from '../../services/chat';
  import userService from '../../services/user';
  import Chat from '../../components/chat.svelte';

  export let f7route;

  let userName = null;
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
    const myUid = localStorage.getItem('uid');

    userService.getUser(f7route.params.id).ensureLoaded().then(u => userName = u.name);

    chatService.getChat(f7route.params.id).then(cs => {
      chats = cs.map(c => ({
        id: c.id,
        to: c.uid_from === myUid ? c.uid_from : undefined,
        from: c.uid_from === myUid ? undefined : c.uid_from,
        fromName: c.name_from,
        text: c.message,
      }));
    });

    const messageSentSubscription = chatService.messageSent(msg => {
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

    const messageReceivedSubscription = chatService.messageReceived(msg => {
      if (msg.from === f7route.params.id) {
        chats = [...chats, {
          id: msg.id,
          from: msg.from,
          fromName: msg.fromName,
          text: msg.text,
        }];
      }
    });

    return () => {
      messageSentSubscription.unsubscribe();
      messageReceivedSubscription.unsubscribe();
    };
  });
</script>

<Page>
  <Navbar title="{userName}" backLink="Back" />
  <div style="height: 100%">
    <Chat {chats} {pendingChats} {onSend} />
  </div>
</Page>
