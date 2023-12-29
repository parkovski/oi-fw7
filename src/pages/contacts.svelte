<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  import Contacts from '../components/contacts.svelte';
  import userService from '../services/user';
  import { onLogin } from '../js/onlogin';
  import { onMount } from 'svelte';

  let contacts = [];

  onMount(() => {
    const subscription = userService.getContacts().subscribe(value => {
      contacts = value.contacts.concat(value.pending.map(p => ({
        has_contact: 'pending',
        ...p,
      })));
    });
    onLogin(() => userService.getContacts().refresh());

    return () => subscription.unsubscribe();
  });
</script>

<Page>
  <Navbar title="Contacts" />
  <Contacts contacts={contacts}/>
</Page>
