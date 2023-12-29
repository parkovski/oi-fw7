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
    Popover,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import userService from '../services/user';

  export let f7route;

  let contact = {
    id: f7route.params.id,
    name: '',
    username: '',
  };

  let cancelRequestPopover;
  let removeContactPopover;

  onMount(() => {
    const subscription = userService.getUser(contact.id).subscribe(user => contact = user);
    return () => subscription.unsubscribe();
  });

  function addContact() {
    userService.addContact(contact.id);
  }

  function removeContact() {
    userService.removeContact(contact.id);
    cancelRequestPopover.instance().close();
    removeContactPopover.instance().close();
  }
</script>

<Page>
  <Navbar title="Contact" backLink="Back" />
  <Card>
    <CardHeader>
      <div>
        <Icon ios="f7:person_fill" md="material:person"
          /><span style="margin-left: 8px">{contact.name}</span>
      </div>
      {#if contact.kind === 0}
        <Button popoverOpen="#contact-pending-popover">
          <Icon ios="f7:ellipsis" md="material:more_horiz" />
        </Button>
      {:else if contact.kind === 1}
        <Button popoverOpen="#remove-contact-popover">
          <Icon ios="f7:person_badge_minus" md="material:person_remove" />
        </Button>
      {:else}
        <Button onClick={addContact}>
          <Icon ios="f7:person_badge_plus" md="material:person_add" />
        </Button>
      {/if}
    </CardHeader>
    <CardContent>
      <p>Username: {contact.username}</p>
    </CardContent>
  </Card>
  <Popover id="contact-pending-popover" verticalPosition="bottom"
    bind:this={cancelRequestPopover}
  >
    <List>
      <ListItem title="Cancel request" onClick={removeContact} />
    </List>
  </Popover>
  <Popover id="remove-contact-popover" verticalPosition="bottom"
    bind:this={removeContactPopover}
  >
    <List>
      <ListItem title="Remove contact" onClick={removeContact} />
    </List>
  </Popover>
</Page>
