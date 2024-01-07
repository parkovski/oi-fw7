<script>
  import {
    List,
    ListItem,
  } from 'framework7-svelte';
  import { formatTime, formatDate } from '../js/timeutils';

  export let events = [];
  export let groupEvents = false;
  $: events = events.sort((a, b) => a.startTime - b.startTime);

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
  {#each events as event (event.id)}
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
