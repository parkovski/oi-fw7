<script>
  import {
    Page,
    Navbar,
    List,
    ListInput,
    ListButton,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../components/select.svelte';
  import userService from '../services/user';

  let contacts = [];
  let contactsSelected;
  let title;
  let location;
  let date;
  let description;

  onMount(() => {
    userService.getContacts().ensureLoaded().then(
      contactData => contacts = contactData.contacts.map(c => ({
        value: c.id,
        label: c.name,
      }))
    );
  });
</script>

<style>
  .contact-select-container {
    margin: 8px 16px;
  }
</style>

<Page>
  <Navbar title="New Event" backLink="Back" />
  <List form>
    <ListInput type="text" name="title" placeholder="Event title" bind:value={title} />
    <ListInput type="text" name="location" placeholder="Location" bind:value={location} />
    <ListInput type="datepicker" name="date" placeholder="Date" bind:value={date} />
    <div class="contact-select-container">
      <Select items={contacts} searchable multiple
        placeholder="Select contacts" bind:value={contactsSelected}
      />
    </div>
    <ListInput type="textarea" name="description" placeholder="Description"
      bind:value={description} />
    <ListButton>Create event</ListButton>
  </List>
</Page>
