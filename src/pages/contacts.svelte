<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  import ContactsView from '../components/contacts.svelte';
  import ContactsService from '../services/contacts';
  import { onMount } from 'svelte';

  let service = new ContactsService;
  let contacts = [];

  onMount(() => {
    const subscription = service.subscribe(value => contacts = value);

    return () => subscription.unsubscribe();
  });
</script>

<Page>
  <Navbar title="Contacts" />
  <ContactsView contacts={contacts}/>
</Page>
