<script>
  import {
    Page,
    Navbar,
    NavTitle,
    NavRight,
    Block,
    Button,
    Icon,
    Fab,
    Link,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import cookie from 'cookie';

  import Contacts from '../components/contacts.svelte';
  import Chat from '../components/chat.svelte';
  import Calendar from '../components/calendar.svelte';
  import groupService from '../services/group';

  export let f7route;
  export let f7router;

  let currentButton = 'chat';
  let group = {
    loading: true,
  };
  let chats = [];
  let chatsAggregate = [];
  let pendingChats = [];

  const events = (function() {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    return [
      {
        date: new Date(todayYear, todayMonth, todayDay),
        hours: 1,
        minutes: 0,
        title: 'Test Event',
        color: '#2196f3',
      },
      {
        date: new Date(todayYear, todayMonth, todayDay + 1),
        hours: 2,
        minutes: 30,
        title: 'Test Event 2',
        color: '#4caf50',
      },
    ];
  })();

  function getAggregateChats(chats) {
    const aggregate = [];
    let currentSet = null;
    for (let i = 0; i < chats.length; ++i) {
      if (currentSet === null || chats[i].from !== currentSet[0].from) {
        currentSet = [chats[i]];
        aggregate.push({
          chats: currentSet,
          id: chats[i].id,
        });
      } else {
        currentSet.push(chats[i]);
      }
    }
    return aggregate;
  }
  $: chatsAggregate = getAggregateChats(chats);

  function changeView(view) {
    return function() {
      const oldButton = document.getElementById(`${currentButton}Button`);
      const newButton = document.getElementById(`${view}Button`);
      if (oldButton === newButton) {
        return;
      }
      oldButton.classList.remove('button-fill');
      newButton.classList.add('button-fill');
      currentButton = view;
    };
  }

  function onSend(text) {
    const pending = groupService.send({
      to: f7route.params.id,
      text,
    });
    pendingChats = [...pendingChats, pending];
  }

  async function loadChat() {
    const myUid = cookie.parse(document.cookie)?.uid || '0';
    chats = (await groupService.getGroupChat(f7route.params.id)).map(c => ({
      id: c.id,
      to: f7route.params.id,
      from: c.uid_from === myUid ? undefined : c.uid_from,
      fromName: c.name,
      text: c.message,
    }));
  }

  async function joinGroup() {
    await groupService.joinGroup(f7route.params.id);
    const group = groupService.getGroup(f7route.params.id);
    await group.refresh();
    if ((await group.ensureLoaded()).memberKind > 0) {
      loadChat();
    }
  }

  async function leaveGroup() {
    await groupService.leaveGroup(f7route.params.id);
    groupService.getGroup(f7route.params.id).refresh();
    f7router.navigate('/groups/');
  }

  onMount(() => {
    const myUid = cookie.parse(document.cookie)?.uid || '0';

    const groupEntity = groupService.getGroup(f7route.params.id);
    const groupSubscription = groupEntity.subscribe(value => group = value);
    groupEntity.ensureLoaded().then(value => {
      if (value.memberKind && value.memberKind > 0) {
        loadChat();
      }
    });

    const messageSentSubscription = groupService.observeMessageSent().subscribe(msg => {
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
    const messageReceivedSubscription = groupService.observeMessageReceived().subscribe(msg => {
      if (msg.from !== myUid && msg.to === f7route.params.id) {
        chats = [...chats, {
          id: msg.id,
          from: msg.from,
          fromName: msg.fromName,
          text: msg.text,
        }];
      }
    });

    return () => {
      groupSubscription.unsubscribe();
      messageSentSubscription.unsubscribe();
      messageReceivedSubscription.unsubscribe();
    };
  });
</script>

<style>
  .group-container {
    height: 100%;
    /* There's a small amount of unnecessary scrolling without this. */
    overflow-y: hidden;
    width: 100%;
  }

  .chat-container, .contacts-container {
    /* Exclude the height of the chat/calendar/members buttons */
    height: calc(100% - 20px - var(--f7-button-height) - var(--f7-button-border-width, 0) * 2);
  }

  .contacts-container {
    overflow-y: scroll;
  }
</style>

<Page>
  <Navbar backLink="Back">
    <NavTitle>{group.name}</NavTitle>
    {#if group.memberKind !== null && group.memberKind > 0}
      <NavRight>
        <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
      </NavRight>
    {/if}
  </Navbar>
  {#if group.loading}
    <Block>
      Loading...
    </Block>
  {:else}
    {#if group.memberKind !== null && group.memberKind > 0}
      <div class="group-container">
        <Block style="margin: 10px 0">
          <div class="grid grid-cols-3 grid-gap">
            <Button fill id="chatButton" on:click={changeView('chat')}>Chat</Button>
            <Button id="calendarButton" on:click={changeView('calendar')}>Calendar</Button>
            <Button id="membersButton" on:click={changeView('members')}>Members</Button>
          </div>
        </Block>
      {#if currentButton === 'chat'}
        <div class="chat-container">
          <Chat aggregate={chatsAggregate} {pendingChats} {onSend} />
        </div>
      {:else if currentButton === 'calendar'}
        <Fab position="right-bottom" href="/groups/newevent/">
          <Icon ios="f7:plus" md="material:add" />
        </Fab>
        <Calendar {events} elementId="group-calendar" />
      {:else if currentButton === 'members'}
        <div class="contacts-container">
          <Contacts contacts={group.members} />
        </div>
      {/if}
    </div>
    {:else if group.memberKind === -1}
      <Block>
        You have requested to join this group.
      </Block>
      <Block>
        <Button fill color="red" on:click={leaveGroup}>Abandon request</Button>
      </Block>
    {:else}
      <Block>
        You are not a member of this group.
      </Block>
      <Block>
        <Button fill on:click={joinGroup}>Join group</Button>
      </Block>
    {/if}
  {/if}
</Page>
