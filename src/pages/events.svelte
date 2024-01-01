<script>
  import {
    Page,
    Navbar,
    Icon,
    Fab,
  } from 'framework7-svelte';
  import Calendar from '../components/calendar.svelte';

  export let f7router;

  let value;

  const events = (function() {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    return [
      {
        date: new Date(todayYear, todayMonth, todayDay),
        hours: 1,
        minutes: 0,
        title: 'Test Event',
        color: '#2196f3',
      },
      {
        date: new Date(todayYear, todayMonth, todayDay + 1),
        hours: 2,
        minutes: 30,
        title: 'Test Event 2',
        color: '#4caf50',
      },
    ];
  })();

  function newEventClicked() {
    f7router.navigate('/events/new/', { props: { initialDate: value } });
  }
</script>

<Page>
  <Navbar title="Events" />
  <Fab position="right-bottom" onClick={newEventClicked}>
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  <Calendar {events} elementId="events-calendar" bind:value />
</Page>
