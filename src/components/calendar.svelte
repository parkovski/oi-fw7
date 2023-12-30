<script>
  import {
    f7,
    Page,
    Navbar,
    Block,
    BlockTitle,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  export let events = [];
  export let elementId = '#calendar';

  let calendar;
  let eventItems = [];

  function renderEvents(calendar) {
    const currentDate = calendar.value[0];
    const currentEvents = events.filter(event => {
      return event.date.getTime() >= currentDate.getTime()
        && event.date.getTime() < currentDate.getTime() + 24 * 60 * 60 * 1000
    });

    const eventItemsTmp = [];
    currentEvents.forEach(e => {
      const hours = e.hours;
      const minutes = e.minutes < 10 ? `0${e.minutes}` : e.minutes;
      eventItemsTmp.push({
        title: e.title,
        time: minutes === '00' ? `${hours}h` : `${hours}h ${minutes}m`,
        color: e.color,
      });
    });
    eventItems = eventItemsTmp;
  }

  onMount(() => {
    calendar = f7.calendar.create({
      containerEl: '#' + elementId,
      value: [new Date()],
      events,
      on: {
        change(c) {
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
  .item-inner {
    padding-left: 16px;
  }
  :global(.toolbar.toolbar-top) {
    top: 0 !important;
  }
</style>

<div id={elementId}></div>
<List class="no-margin no-hairlines no-safe-area-left">
  {#each eventItems as evt}
    <ListItem class="no-padding">
      <div class="event-color" style={`background-color: ${evt.color}`}></div>
      <div class="item-inner">
        <div class="item-title">{evt.title}</div>
        <div class="item-after">{evt.time}</div>
      </div>
    </ListItem>
  {/each}
</List>
