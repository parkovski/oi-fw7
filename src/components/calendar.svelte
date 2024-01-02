<script>
  import {
    f7,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { formatTimeRange } from '../js/timeutils';

  export let events = [];
  export let elementId = '#calendar';
  export let value;
  export let calendar;

  let eventItems = [];

  $: calendar && (calendar.params.events = events) && calendar.update();

  function renderEvents(calendar) {
    const currentDate = calendar.value[0];
    const currentEvents = events.filter(event => {
      return event.date.getTime() >= currentDate.getTime()
        && event.date.getTime() < currentDate.getTime() + 24 * 60 * 60 * 1000
    });

    const eventItemsTmp = [];
    currentEvents.forEach(e => {
      eventItemsTmp.push({
        id: e.id,
        title: e.title,
        time: formatTimeRange(e.startTime, e.endTime),
        color: e.color,
        kind: e.kind,
      });
    });
    eventItemsTmp.sort((a, b) => a.startTime < b.startTime);
    eventItems = eventItemsTmp;
  }

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
    }
  }

  onMount(() => {
    calendar = f7.calendar.create({
      containerEl: '#' + elementId,
      value: [new Date()],
      events,
      on: {
        change(c) {
          value = c.value[0];
          renderEvents(c);
        }
      },
    });

    return () => calendar.destroy();
  });
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
  :global(.toolbar.toolbar-top) {
    top: 0 !important;
  }
</style>

<div id={elementId}></div>
<List class="no-margin no-hairlines no-safe-area-left">
  {#each eventItems as event}
    <ListItem class="no-padding" href="/events/view/{event.id}/">
      <div class="event-color" style={`background-color: ${event.color}`}></div>
      <div class="item-title">
        {event.title}
        <div class="item-footer">{getFooterText(event)}</div>
      </div>
      <div class="item-after">{event.time}</div>
    </ListItem>
  {/each}
</List>
