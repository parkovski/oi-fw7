<script>
  import {
    Page,
    Navbar,
    List,
    ListInput,
    ListButton,
    ListItem,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Select from '../../components/select.svelte';
  import TimePicker from '../../components/timepicker.svelte';
  import uploadPhoto from '../../js/uploadphoto';
  import userService from '../../services/user';
  import eventService from '../../services/event';

  export let initialDate;
  export let f7router;

  let contacts = [];
  let contactsSelected;
  let title = '';
  let location = '';
  let dates = [new Date];
  let times;
  let description;
  let isPublic = false;
  let coverPhotoFile;
  let coverPhotoUrl;

  let validationErrorTitle = null;
  let validationErrorLocation = null;
  let validationErrorDate = null;
  let validationErrorTime = null;

  onMount(() => {
    userService.getContacts().get().then(
      contactData => contacts = contactData.contacts.map(c => ({
        value: c.id,
        label: c.name,
      }))
    );
    if (initialDate) {
      dates = [initialDate];
    }
    const coverPhoto = document.getElementById('cover-photo');
    coverPhoto.style.background = `no-repeat center/100%`;
    coverPhoto.style.backgroundImage = `url(/images/cover-blank.png)`;

    return () => {
      coverPhotoUrl && URL.revokeObjectURL(coverPhotoUrl);
    }
  });

  function choosePhoto() {
    uploadPhoto(function(file) {
      const oldUrl = coverPhotoUrl;
      const coverPhoto = document.getElementById('cover-photo');
      coverPhotoFile = file;
      coverPhotoUrl = URL.createObjectURL(file);
      coverPhoto.style.backgroundImage = `url("${coverPhotoUrl}")`;
      oldUrl && URL.revokeObjectURL(oldUrl);
    });
  }

  function getDates() {
    let startDate = new Date(dates[0]), endDate = new Date(dates[0]);
    let startTime = times[0].split(':').map(x => +x);
    let endTime = times[1].split(':').map(x => +x);
    startDate.setHours(startTime[0]);
    startDate.setMinutes(startTime[1]);
    startDate.setSeconds(0);
    endDate.setHours(endTime[0]);
    endDate.setMinutes(endTime[1]);
    endDate.setSeconds(0);
    return [startDate, endDate];
  }

  function validateInputs() {
    let ok = true;
    if (title.length === 0) {
      validationErrorTitle = 'Title cannot be empty';
      ok = false;
    } else if (title.length > 255) {
      validationErrorTitle = 'Title is too long';
      ok = false;
    } else {
      validationErrorTitle = null;
    }

    if (location.length === 0) {
      validationErrorLocation = 'Location cannot be empty';
      ok = false;
    } else if (location.length > 255) {
      validationErrorLocation = 'Location is too long';
      ok = false;
    } else {
      validationErrorLocation = null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dates[0].valueOf() < today.valueOf()) {
      validationErrorDate = 'Event starts in the past';
      validationErrorTime = null;
      ok = false;
    } else {
      validationErrorDate = null;
      const datesWithTime = getDates();
      const now = new Date();
      if (datesWithTime[0].valueOf() < now.valueOf()) {
        validationErrorTime = 'Event starts in the past';
        ok = false;
      } else {
        validationErrorTime = null;
      }
    }
    return ok;
  }

  async function createClicked() {
    if (!validateInputs()) {
      return;
    }
    const dates = getDates();
    const eid = await eventService.newEvent(
      title,
      description.length === 0 ? null : description,
      location,
      dates[0],
      dates[1],
      isPublic,
      contactsSelected?.map(c => c.value),
      coverPhotoFile,
    );
    f7router.navigate(`/events/view/${eid}/`, { reloadCurrent: true });
  }
</script>

<style>
  #cover-photo {
    position: relative;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  :global(#cover-photo > .button) {
    position: absolute;
    right: 4px;
    bottom: 4px;
  }
</style>

<Page>
  <Navbar title="New Event" backLink="Back" />
  <List form style="margin-top: .5em">
    <ListItem class="center">
      <div id="cover-photo">
        <Button fill onClick={choosePhoto}>Choose a photo</Button>
      </div>
    </ListItem>
    <ListInput type="text" name="title" placeholder="Event title" bind:value={title} />
    {#if validationErrorTitle}
      <ListItem style="color: var(--f7-color-red)">
        {validationErrorTitle}
      </ListItem>
    {/if}
    <ListInput type="text" name="location" placeholder="Location" bind:value={location} />
    {#if validationErrorLocation}
      <ListItem style="color: var(--f7-color-red)">
        {validationErrorLocation}
      </ListItem>
    {/if}
    <ListInput type="datepicker" name="date" placeholder="Date" bind:value={dates} />
    {#if validationErrorDate}
      <ListItem style="color: var(--f7-color-red)">
        {validationErrorDate}
      </ListItem>
    {/if}
    <ListItem>
      <TimePicker range bind:value={times} />
    </ListItem>
    {#if validationErrorTime}
      <ListItem style="color: var(--f7-color-red)">
        {validationErrorTime}
      </ListItem>
    {/if}
    <ListItem>
      <Select items={contacts} searchable multiple
        placeholder="Select contacts" bind:value={contactsSelected}
      />
    </ListItem>
    <ListItem checkbox bind:checked={isPublic}>
      Public event?
    </ListItem>
    <ListInput type="textarea" name="description" placeholder="Description"
      bind:value={description} style="z-index: 1" />
    <ListButton on:click={createClicked}>Create event</ListButton>
  </List>
</Page>
