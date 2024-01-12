<script>
  import {
    Page,
    Navbar,
    NavTitle,
    NavRight,
    Link,
    Block,
    Button,
    Segmented,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import eventService from '../../services/event';
  import { formatTimeRange, formatDate } from '../../js/timeutils';

  export let f7route;

  let event = { loading: true };
  let attendance = {
    hosts: [],
    attending: [],
    maybeAttending: [],
    notAttending: [],
    invited: [],
  };

  function sortAttendance(members) {
    attendance = {
      hosts: [],
      attending: [],
      maybeAttending: [],
      notAttending: [],
      invited: [],
    };
    for (let member of members) {
      switch (member.kind) {
        case -1:
          attendance.notAttending.push(member);
          break;
        case 0:
          attendance.invited.push(member);
          break;
        case 1:
          attendance.maybeAttending.push(member);
          break;
        case 2:
          attendance.attending.push(member);
          break;
        case 3:
          attendance.hosts.push(member);
          break;
      }
    }
  }

  let currentButton = 'event';
  function changeView(view) {
    return function() {
      const oldButton = document.getElementById(`${currentButton}Button`);
      const newButton = document.getElementById(`${view}Button`);
      if (oldButton === newButton) {
        return;
      }
      oldButton.classList.remove('button-fill');
      newButton.classList.add('button-fill');
      currentButton = view;
    };
  }

  function setAttendance(kind) {
    return function() {
      eventService.setAttendance(event.id, kind);
    }
  }

  async function onRefresh(done) {
    await eventService.getEvent(f7route.params.id).refresh();
    done();
  }

  onMount(() => {
    const eventSubscription =
      eventService.getEvent(f7route.params.id).subscribe(e => {
        event = e;
        sortAttendance(e.members);
      });

    return () => {
      eventSubscription.unsubscribe();
    };
  });
</script>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar backLink="Back">
    <NavTitle>{event.title}</NavTitle>
    <NavRight>
      <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
    </NavRight>
  </Navbar>
  {#if event.loading}
    <Block>
      Loading...
    </Block>
  {:else}
    <Block class="no-margin"
      style="background-color: var(--f7-navbar-bg-color, var(--f7-bars-bg-color)); padding: 10px">
      <Segmented>
        <Button small fill id="eventButton" on:click={changeView('event')}>Event</Button>
        <Button small id="attendanceButton" on:click={changeView('attendance')}>Attendance</Button>
      </Segmented>
    </Block>
    {#if currentButton === 'event'}
      <List style="margin-top: 0">
        <ListItem>{event.description}</ListItem>
        <ListItem groupTitle>Attending?</ListItem>
        <ListItem>
          {#if event.kind === 3}
            <span style="color: var(--f7-color-green)">You are hosting this event.</span>
          {:else}
            <div class="grid grid-cols-3 grid-gap" style="width: 100%">
              <Button small color="red" on:click={setAttendance(-1)}
                fill={event.kind === -1}>No</Button>
              <Button small color="yellow" on:click={setAttendance(1)}
                fill={event.kind === 1}>Maybe</Button>
              <Button small color="green" on:click={setAttendance(2)}
                fill={event.kind === 2}>Yes</Button>
            </div>
          {/if}
        </ListItem>
        <ListItem groupTitle>Location</ListItem>
        <ListItem>{event.place}</ListItem>
        <ListItem groupTitle>Date and Time</ListItem>
        <ListItem>
          {formatDate(event.startTime)} {formatTimeRange(event.startTime, event.endTime)}
        </ListItem>
      </List>
    {:else if currentButton === 'attendance'}
      <List style="margin-top: 0">
        <ListItem groupTitle>Hosts</ListItem>
        {#each attendance.hosts as user (user.id)}
          <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
        {/each}
        {#if attendance.attending.length}
          <ListItem groupTitle>Attending</ListItem>
          {#each attendance.attending as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
        {#if attendance.maybeAttending.length}
          <ListItem groupTitle>Maybe Attending</ListItem>
          {#each attendance.maybeAttending as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
        {#if attendance.invited.length}
          <ListItem groupTitle>Invited</ListItem>
          {#each attendance.invited as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
        {#if attendance.notAttending.length}
          <ListItem groupTitle>Not Attending</ListItem>
          {#each attendance.notAttending as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
      </List>
    {/if}
  {/if}
</Page>
