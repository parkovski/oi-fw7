<script>
  import {
    Page,
    Navbar,
    NavRight,
    Icon,
    Fab,
    Button,
    f7,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Calendar from '../../components/calendar.svelte';
  import EventList from '../../components/eventlist.svelte';
  import eventService from '../../services/event';

  export let f7router;

  let value;
  let events = [];
  let viewActions;
  let viewKind = localStorage.getItem('event-preferred-view') || 'calendar';

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
            color: '#2196f3',
            // color: '#4caf50',
          };
        });
      });

    return () => {
      eventsSubscription.unsubscribe();
      viewActions && viewActions.destroy();
    };
  });

  function newEventClicked() {
    const props = {};
    if (viewKind === 'calendar') {
      props.initialDate = value;
    }
    f7router.navigate('/events/new/', { props });
  }

  function showViewActions() {
    if (!viewActions) {
      viewActions = f7.actions.create({
        buttons: [
          {
            text: 'View Events',
            label: true,
          },
          {
            text: 'Calendar View',
            onClick: () => {
              viewKind = 'calendar';
              localStorage.setItem('event-preferred-view', 'calendar');
            },
          },
          {
            text: 'List View',
            onClick: () => {
              viewKind = 'list';
              localStorage.setItem('event-preferred-view', 'list');
            },
          },
        ],
        targetEl: document.getElementById('events-ellipsis'),
      });
    }
    viewActions.open();
  }
</script>

<Page>
  <Navbar title="Events">
    <NavRight>
      <Button on:click={showViewActions}>
        <Icon ios="f7:ellipsis" md="material:more_horiz" id="events-ellipsis" />
      </Button>
    </NavRight>
  </Navbar>
  <Fab position="right-bottom" onClick={newEventClicked}>
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  {#if viewKind === 'calendar'}
    <Calendar {events} elementId="events-calendar" bind:value />
  {:else if viewKind === 'list'}
    <EventList {events} />
  {/if}
</Page>
