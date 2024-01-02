<script>
  import {
    f7,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  export let events = [];
  export let elementId = '#calendar';
  export let value;
  export let calendar;

  let eventItems = [];

  $: calendar && (calendar.params.events = events) && calendar.update();

  function getTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    let timeStr, ampm;
    if (hours === 0) {
      timeStr = '12';
      ampm = 'am';
    } else if (hours < 12) {
      timeStr = hours;
      ampm = 'am';
    } else if (hours === 12) {
      timeStr = '12';
      ampm = 'pm';
    } else {
      timeStr = '' + (hours - 12);
      ampm = 'pm';
    }
    if (minutes < 10) {
      timeStr += ':0' + minutes;
    } else {
      timeStr += ':' + minutes;
    }
    return timeStr + ampm;
  }

  function renderEvents(calendar) {
    const currentDate = calendar.value[0];
    const currentEvents = events.filter(event => {
      return event.date.getTime() >= currentDate.getTime()
        && event.date.getTime() < currentDate.getTime() + 24 * 60 * 60 * 1000
    });

    const eventItemsTmp = [];
    currentEvents.forEach(e => {
      const startTime = getTime(e.startTime);
      const endTime = getTime(e.endTime);
      let time;
      if (startTime === endTime) {
        time = startTime;
      } else {
        time = `${startTime} - ${endTime}`;
      }
      eventItemsTmp.push({
        id: e.id,
        title: e.title,
        time,
        startTime,
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
  {#each eventItems as evt}
    <ListItem class="no-padding" href="/events/view/{evt.id}/">
      <div class="event-color" style={`background-color: ${evt.color}`}></div>
      <div class="item-title">
        {evt.title}
        <div class="item-footer">{getFooterText(evt)}</div>
      </div>
      <div class="item-after">{evt.time}</div>
    </ListItem>
  {/each}
</List>
