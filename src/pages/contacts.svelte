<script>
  import {
    Page,
    Navbar,
    useStore,
  } from 'framework7-svelte';

  import ContactsView from '../components/contacts.svelte';
  import ContactsService from '../services/contacts';
  import { onMount } from 'svelte';

  let service;
  let contacts = useStore('contacts', value => contacts = value);

  onMount(() => {
    service = new ContactsService();
  });
</script>

<Page>
  <Navbar title="Contacts" />
  <ContactsView contacts={contacts}/>
</Page>
