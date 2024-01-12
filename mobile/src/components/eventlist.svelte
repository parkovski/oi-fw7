<script>
  import {
    List,
    ListItem,
  } from 'framework7-svelte';
  import { formatTime, formatDate } from '../js/timeutils';

  export let events = [];
  export let groupEvents = false;

  let upcomingEvents = [];
  let pastEvents = [];

  function sortEvents(events) {
    let upcoming = [];
    let past = [];
    events.sort((a, b) => a.startTime - b.startTime).forEach(e => {
      if (e.startTime > new Date) {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    });
    upcomingEvents = upcoming;
    pastEvents = past.reverse();
  }

  $: sortEvents(events);

  function getFooterText(event) {
    switch (event.kind) {
    case -1:
      return 'Not attending';
    case 0:
      return 'Invited';
    case 1:
      return 'Maybe attending';
    case 2:
      return 'Attending';
    case 3:
      return 'Hosting';
    default:
      return 'Group invite';
    }
  }

  function getViewLink(id) {
    if (groupEvents) {
      return `/groups/viewevent/${id}/`;
    } else {
      return `/events/view/${id}/`;
    }
  }

  function formatDateTime(time) {
    return formatTime(time) + ' ' + formatDate(time);
  }
</script>

<style>
  .event-color {
    position: absolute;
    left: 0;
    top: 0;
    width: 8px;
    height: 100%;
  }
  .item-title {
    padding-left: 16px;
  }
</style>

<List style="margin-top: 0">
  <ListItem groupTitle>
    Upcoming Events
  </ListItem>
  {#each upcomingEvents as event (event.id)}
    <ListItem class="no-padding" href={getViewLink(event.id)}>
      <div class="event-color" style='background-color: {event.color}'></div>
      <div class="item-title">
        {event.title}
        <div class="item-footer">{getFooterText(event)}</div>
      </div>
      <div class="item-after">{formatDateTime(event.startTime)}</div>
    </ListItem>
  {/each}
  <ListItem groupTitle>
    Past Events
  </ListItem>
  {#each pastEvents as event (event.id)}
    <ListItem class="no-padding" href={getViewLink(event.id)}>
      <div class="event-color" style='background-color: {event.color}'></div>
      <div class="item-title">
        {event.title}
        <div class="item-footer">{getFooterText(event)}</div>
      </div>
      <div class="item-after">{formatDateTime(event.startTime)}</div>
    </ListItem>
  {/each}
</List>
