<script>
  import {
    Page,
    Navbar,
    List,
    ListInput,
    ListButton,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from 'svelte-select';
  import userService from '../services/user';

  let contacts = [];
  let contactsSelected;
  let title;
  let location;
  let date;
  let description;

  const htmlElement = document.querySelector('html');
  let isDarkMode = htmlElement.classList.contains('dark');

  onMount(() => {
    const observer = new MutationObserver(list => {
      for (let mutation of list) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          isDarkMode = mutation.target.classList.contains('dark');
        }
      }
    });
    observer.observe(htmlElement, { attributes: true });

    userService.getContacts().ensureLoaded().then(
      contactData => contacts = contactData.contacts.map(c => ({
        value: c.id,
        label: c.name,
      }))
    );

    return () => {
      observer.disconnect();
    };
  });
</script>

<style>
  :global(.select-contacts) {
    background-color: var(--f7-input-item-bg-color) !important;
    color: var(--f7-text-color);
  }
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
        class="select-contacts" placeholder="Select contacts"
        bind:value={contactsSelected}
        --list-background="var(--f7-text-editor-bg-color)"
        --item-color="var(--f7-text-color)"
        --item-hover-bg="#888"
        --multi-item-bg={isDarkMode ? "#282828" : undefined}
        --multi-item-clear-icon-color={isDarkMode ? "white" : undefined}
        --multi-item-outline={isDarkMode ? "1px solid #444" : undefined}
        --border={isDarkMode ? "1px solid #444" : undefined}
      />
    </div>
    <ListInput type="textarea" name="description" placeholder="Description"
      bind:value={description} />
    <ListButton>Create event</ListButton>
  </List>
</Page>
