<script>
  import {
    f7,
    Page,
    Navbar,
    Card,
    CardHeader,
    CardContent,
    Icon,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import userService from '../../services/user';

  export let f7route;
  export let f7router;

  let contact = {
    id: f7route.params.id,
    name: '',
    username: '',
    loading: true,
  };

  const myUid = localStorage.getItem('uid');

  let cancelRequestActions;
  let removeContactActions;

  async function onRefresh(done) {
    await userService.getUser(contact.id).refresh();
    done();
  }

  onMount(() => {
    const subscription = userService.getUser(contact.id).subscribe(user => contact = user);
    return () => {
      subscription.unsubscribe();
      cancelRequestActions && cancelRequestActions.destroy();
      removeContactActions && removeContactActions.destroy();
    }
  });

  function sendMessage() {
    f7router.navigate(`/messages/view/${contact.id}/`);
  }

  function addContact() {
    userService.addContact(contact.id);
  }

  function removeContact() {
    userService.removeContact(contact.id);
  }

  function confirmCancelRequest() {
    if (!cancelRequestActions) {
      cancelRequestActions = f7.actions.create({
        buttons: [
          {
            text: 'Cancel request?',
            label: true,
          },
          {
            text: 'Cancel request',
            color: 'red',
            onClick: removeContact,
          },
          {
            text: 'Keep request',
          },
        ],
        targetEl: document.getElementById('cancel-request-button'),
      });
    }
    cancelRequestActions.open();
  }

  function confirmRemoveContact() {
    if (!removeContactActions) {
      removeContactActions = f7.actions.create({
        buttons: [
          {
            text: 'Remove contact?',
            label: true,
          },
          {
            text: 'Remove',
            color: 'red',
            onClick: removeContact,
          },
          {
            text: 'Cancel',
          }
        ],
        targetEl: document.getElementById('remove-contact-button'),
      });
    }
    removeContactActions.open();
  }
</script>

<style>
  .name-container {
    display: inline-flex;
    flex-flow: column;
    margin-left: 8px;
  }
  .small-text {
    font-size: 75%;
  }
  :global(.up) {
    margin-top: -24px;
  }
</style>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar title="Contact" backLink="Back" />
  <Card>
    <CardHeader>
      <div>
        {#if contact.avatarUrl}
          <img
            src={`https://api.oi.parkovski.com/uploads/${contact.avatarUrl}`}
            alt="Profile" width="48" height="48"
            style="border-radius: 100px; vertical-align: top">
        {:else}<Icon ios="f7:person_fill" md="material:person" class="icon"
        />{/if}<div class="name-container">
          <div>@{contact.username}</div>
          {#if contact.name}<div class="small-text">{contact.name}</div>{/if}
        </div>
      </div>
      {#if contact.kind === 0}
        <Button id="cancel-request-button" on:click={confirmCancelRequest}>
          <Icon ios="f7:ellipsis" md="material:more_horiz" />
        </Button>
      {:else if contact.kind === 1}
        <Button id="remove-contact-button" on:click={confirmRemoveContact}>
          <Icon ios="f7:person_badge_minus" md="material:person_remove" />
        </Button>
      {:else if !contact.loading && contact.id !== myUid}
        <Button onClick={addContact}>
          <Icon ios="f7:person_badge_plus" md="material:person_add" />
        </Button>
      {/if}
    </CardHeader>
    <CardContent>
      <Button onClick={sendMessage}>Send message</Button>
    </CardContent>
  </Card>
</Page>
