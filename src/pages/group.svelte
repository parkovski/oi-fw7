<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
    useStore,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import ContactsView from '../components/contacts.svelte';
  import ChatView from '../components/chat.svelte';
  import GroupsService from '../services/groups';

  export let f7route;

  let currentButton = 'chat';
  let service;
  let group;
  useStore('groups', value => group = value[+f7route.params.id]);

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

  onMount(() => {
    service = new GroupsService();
  });
</script>

<style>
  .group-container {
    height: 100%;
    /* There's a small amount of unnecessary scrolling without this. */
    overflow-y: hidden;
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
  <Navbar title={`Group ${f7route.params.id}`} backLink="Back" />
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
      <ChatView />
    </div>
  {:else if currentButton === 'calendar'}
    <p>Calendar</p>
  {:else if currentButton === 'members'}
    <div class="contacts-container">
      <ContactsView contacts={group.members} />
    </div>
  {/if}
</Page>
