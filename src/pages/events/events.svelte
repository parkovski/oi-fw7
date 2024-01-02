<script>
  import {
    Page,
    Navbar,
    Icon,
    Fab,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Calendar from '../../components/calendar.svelte';
  import eventService from '../../services/event';

  export let f7router;

  let value;
  let events = [];
  let calendar;

  onMount(() => {
    const eventsSubscription =
      eventService.getEvents().subscribe(es => {
        events = es.map(e => {
          return {
            id: e.id,
            title: e.title,
            // The calendar seems to only show events with 0hr 0min.
            date: new Date(
              e.startTime.getFullYear(), e.startTime.getMonth(), e.startTime.getDate()),
            startTime: e.startTime,
            endTime: e.endTime,
            kind: e.kind,
            hours: 1,
            minutes: 0,
            color: '#2196f3',
            // color: '#4caf50',
          };
        });
      });

    return () => {
      eventsSubscription.unsubscribe();
    };
  });

  function newEventClicked() {
    f7router.navigate('/events/new/', { props: { initialDate: value } });
  }
</script>

<Page>
  <Navbar title="Events" />
  <Fab position="right-bottom" onClick={newEventClicked}>
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  <Calendar {events} elementId="events-calendar" bind:value bind:calendar />
</Page>
