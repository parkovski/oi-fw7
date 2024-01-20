<script>
  import {
    Page,
    Navbar,
    NavTitle,
    NavRight,
    Segmented,
    Block,
    Button,
    Icon,
    Fab,
    Link,
    Badge,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import Contacts from '../../components/contacts.svelte';
  import Chat from '../../components/chat.svelte';
  import Calendar from '../../components/calendar.svelte';
  import groupService from '../../services/group';

  export let f7route;
  export let f7router;

  let currentButton = 'chat';
  let group = { loading: true };
  let chats = [];
  let chatsAggregate = [];
  let pendingChats = [];
  let events = [];
  let upcomingEvents = [];
  let calendarValue;

  function getUpcomingEvents(events) {
    const upcoming = [];
    const now = new Date;
    events.forEach(e => {
      if (e.startTime > now) {
        upcoming.push(e);
      }
    });
    upcomingEvents = upcoming;
  }

  $: getUpcomingEvents(events);

  function getColorForKind(kind) {
    switch (kind) {
    case -1:
      return 'var(--f7-color-red)';
    case 0:
      return 'var(--f7-color-orange)';
    case 1:
      return 'var(--f7-color-yellow)';
    case 2:
      return 'var(--f7-color-green)';
    case 3:
      return 'var(--f7-color-blue)';
    default:
      return 'var(--f7-color-orange)';
    }
  }

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
    const myUid = localStorage.getItem('uid');

    const cs = await groupService.getGroupChat(f7route.params.id);
    chats = cs.map(c => ({
      id: c.id,
      to: f7route.params.id,
      from: c.from,
      fromName: c.fromName,
      fromUsername: c.fromUsername,
      text: c.message,
    }));
    const unread = cs.filter(c => c.from !== myUid && !c.received).map(c => c.id);
    groupService.acknowledge(unread, f7route.params.id);
  }

  async function joinGroup() {
    await groupService.joinGroup(f7route.params.id);
    const group = groupService.getGroup(f7route.params.id);
    await group.refresh();
    if ((await group.get()).memberKind > 0) {
      loadChat();
    }
  }

  async function leaveGroup() {
    await groupService.leaveGroup(f7route.params.id);
    groupService.getGroup(f7route.params.id).refresh();
    f7router.navigate('/groups/');
  }

  function newEventClicked() {
    const props = {};
    //if (viewKind === 'calendar') {
      props.initialDate = calendarValue;
    //}
    f7router.navigate(`/groups/newevent/${f7route.params.id}/`, { props });
  }

  async function onRefresh(done) {
    await Promise.all([
      groupService.getGroup(f7route.params.id).refresh(),
      groupService.getEvents(f7route.params.id).refresh(),
    ]);
    done();
  }

  onMount(() => {
    const myUid = localStorage.getItem('uid');

    const groupEntity = groupService.getGroup(f7route.params.id);
    const groupSubscription = groupEntity.subscribe(value => group = value);
    groupEntity.get().then(value => {
      if (value.memberKind && value.memberKind > 0) {
        loadChat();
      }
    });

    const groupEventsSubscription =
      groupService.getEvents(f7route.params.id).subscribe(es => {
        events = es.map(e => ({
          id: e.id,
          title: e.title,
          date: new Date(e.startTime.getFullYear(), e.startTime.getMonth(),
                         e.startTime.getDate()),
          startTime: e.startTime,
          endTime: e.endTime,
          kind: e.kind,
          color: getColorForKind(e.kind),
        }));
      });


    const messageSentSubscription = groupService.messageSent(msg => {
      const chat = pendingChats.find(pend => pend.uuid === msg.uuid);
      if (chat) {
        pendingChats = pendingChats.filter(pend => pend.uuid !== msg.uuid);
        chats = [...chats, {
          id: msg.id,
          to: msg.to,
          from: myUid,
          text: msg.text,
        }];
      }
    });
    const messageReceivedSubscription = groupService.messageReceived(msg => {
      if (msg.from !== myUid && msg.to === f7route.params.id) {
        chats = [...chats, {
          id: msg.id,
          from: msg.from,
          fromName: msg.fromName,
          text: msg.text,
        }];
        groupService.acknowledge(msg.id, msg.to);
      }
    });

    return () => {
      groupSubscription.unsubscribe();
      groupEventsSubscription.unsubscribe();
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

  .group-description {
    padding: 0 16px;
  }
</style>

<Page ptr onPtrRefresh={onRefresh}>
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
        <Block class="no-margin"
          style="background-color: var(--f7-navbar-bg-color, var(--f7-bars-bg-color)); padding: 10px">
          <Segmented>
            <Button small fill id="chatButton" on:click={changeView('chat')}>Chat</Button>
            <Button small id="calendarButton" on:click={changeView('calendar')}>
              Calendar
              {#if upcomingEvents.length}
                <Badge color="blue" style="margin-left: 8px">{upcomingEvents.length}</Badge>
              {/if}
            </Button>
            <Button small id="membersButton" on:click={changeView('members')}>Summary</Button>
          </Segmented>
        </Block>
      {#if currentButton === 'chat'}
        <div class="chat-container">
          <Chat aggregate={chatsAggregate} {pendingChats} {onSend} />
        </div>
      {:else if currentButton === 'calendar'}
        <Fab position="right-bottom" onClick={newEventClicked}>
          <Icon ios="f7:plus" md="material:add" />
        </Fab>
        <Calendar groupEvents {events} elementId="group-calendar"
          bind:value={calendarValue} />
      {:else if currentButton === 'members'}
        {#if group.description}
          <div class="group-description">
            <p>{group.description}</p>
          </div>
        {/if}
        <div class="group-description">
          <p>This group is {#if group.public}public{:else}private{/if}.</p>
        </div>
        <div class="contacts-container">
          <Contacts contacts={group.members} requestedText="Invited" />
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
