<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  import ContactsView from '../components/contacts.svelte';
  import userService from '../services/user';
  import { onLogin } from '../js/onlogin';
  import { onMount } from 'svelte';

  let contacts = [];

  onMount(() => {
    const subscription = userService.getContacts().subscribe(
      value => contacts = value
    );
    onLogin(() => userService.getContacts().refresh());

    return () => subscription.unsubscribe();
  });
</script>

<Page>
  <Navbar title="Contacts" />
  <ContactsView contacts={contacts}/>
</Page>
