<script>
  import {
    Page,
    Navbar,
    Block,
    Icon,
    Fab,
  } from 'framework7-svelte';
  import Calendar from '../components/calendar.svelte';

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
</script>

<Page>
  <Navbar title="Events" />
  <Fab position="right-bottom" href="/events/new/">
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  <Block strong class="no-padding no-margin">
    <div id="events-calendar"></div>
  </Block>
  <Calendar {events} elementName="#events-calendar" />
</Page>
