<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
    Segmented,
  } from 'framework7-svelte';

  import Contacts from '../../components/contacts.svelte';
  import ContactRequests from '../../components/contactrequests.svelte';
  import userService from '../../services/user';
  import { onLogin } from '../../js/onlogin';
  import { onMount } from 'svelte';

  let contacts = [];
  let followers = [];
  let requests = [];
  let currentButton = 'following';

  async function onRefresh(done) {
    await Promise.all([
      userService.getContacts().refresh(),
      userService.getContactRequests().refresh(),
    ]);
    done();
  }

  onMount(() => {
    let contactsSubscription;
    let requestsSubscription;
    onLogin(() => {
      contactsSubscription = userService.getContacts().subscribe(value => {
        contacts = value.contacts.concat(value.pending);
        followers = value.followers;
      });
      requestsSubscription = userService.getContactRequests().subscribe(value =>
        requests = value
      );
    });

    return () => {
      contactsSubscription && contactsSubscription.unsubscribe();
      requestsSubscription && requestsSubscription.unsubscribe();
    };
  });

  function changeView(view) {
    return function() {
      const oldButton = document.getElementById(`${currentButton}Button`)
      const newButton = document.getElementById(`${view}Button`);
      if (oldButton === newButton) {
        return;
      }
      oldButton.classList.remove('button-fill');
      newButton.classList.add('button-fill');
      currentButton = view;
    }
  }

  function approveContact(id) {
    userService.approveContact(id);
  }

  function denyContact(id) {
    userService.denyContact(id);
  }
</script>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar title="Contacts" />
  <Block class="no-margin"
    style="background-color: var(--f7-navbar-bg-color, var(--f7-bars-bg-color)); padding: 10px">
    <Segmented>
      <Button small fill id="followingButton" on:click={changeView('following')}>Following</Button>
      <Button small id="followersButton" on:click={changeView('followers')}>Followers</Button>
      <Button small id="requestsButton" on:click={changeView('requests')}>Requests</Button>
    </Segmented>
  </Block>
  {#if currentButton === 'following'}
    <Contacts contacts={contacts} />
  {:else if currentButton === 'followers'}
    <Contacts contacts={followers} />
  {:else if currentButton === 'requests'}
    {#if requests.length === 0}
      <Block>
        You have no contact requests.
      </Block>
    {:else}
      <ContactRequests contacts={requests} onApprove={approveContact} onDeny={denyContact}/>
    {/if}
  {/if}
</Page>
