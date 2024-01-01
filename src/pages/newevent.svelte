<script>
  import {
    Page,
    Navbar,
    List,
    ListInput,
    ListButton,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../components/select.svelte';
  import TimePicker from '../components/timepicker.svelte';
  import userService from '../services/user';

  let contacts = [];
  let contactsSelected;
  let title;
  let location;
  let dates = [new Date];
  let times;
  let description;
  let isPublic;

  onMount(() => {
    userService.getContacts().ensureLoaded().then(
      contactData => contacts = contactData.contacts.map(c => ({
        value: c.id,
        label: c.name,
      }))
    );
  });

  function getDates() {
    let startDate = new Date(dates[0]), endDate = new Date(dates[0]);
    let startTime = times[0].split(':').map(x => +x);
    let endTime = times[0].split(':').map(x => +x);
    startDate.setHours(startTime[0]);
    startDate.setMinutes(startTime[1]);
    startDate.setSeconds(0);
    endDate.setHours(endTime[0]);
    endDate.setMinutes(endTime[1]);
    endDate.setSeconds(0);
    return [startDate, endDate];
  }

  function createClicked() {
    console.log('Create event clicked');
    console.log(getDates());
  }
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
    <ListInput type="datepicker" name="date" placeholder="Date" bind:value={dates} />
    <ListItem>
      <TimePicker range bind:value={times} />
    </ListItem>
    <div class="contact-select-container">
      <Select items={contacts} searchable multiple
        placeholder="Select contacts" bind:value={contactsSelected}
      />
    </div>
    <ListItem>
      <label>
        <input type="checkbox" name="public" bind:checked={isPublic} />
        Public event?
      </label>
    </ListItem>
    <ListInput type="textarea" name="description" placeholder="Description"
      bind:value={description} />
    <ListButton on:click={createClicked}>Create event</ListButton>
  </List>
</Page>
