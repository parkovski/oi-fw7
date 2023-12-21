<script>
  import {
    Page,
    Navbar,
    Card,
    CardHeader,
    CardContent,
    Icon,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import UserService from '../services/user';

  export let f7route;

  const service = new UserService(f7route.params.id);
  let contact = {
    name: '',
    username: '',
  };

  onMount(() => {
    const subscription = service.subscribe(user => contact = user);
    return () => subscription.unsubscribe();
  });

  function addContact() {
    service.addContact();
  }

  function removeContact() {
    service.removeContact();
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
      {#if contact.has_contact}
        <Button onClick={removeContact}>
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
</Page>
