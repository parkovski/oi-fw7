<script>
  import {
    Page,
    Navbar,
    NavTitle,
    NavRight,
    Link,
    Card,
    CardHeader,
    CardContent,
  } from 'framework7-svelte';
  import summaryService from '../../services/summary';
  import { onMount } from 'svelte';
  import { onLogin } from '../../js/onlogin';

  let items = [];

  function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function translateItem(item) {
    const [kind, id] = item.id.split(':');
    switch (kind) {
    case 'groupinvite':
      return {
        id: item.id,
        title: 'Group invite',
        name: item.name,
        link: `/groups/viewinvite/${id}/`,
        textBefore: 'You\'ve been invited to join the group ',
        textAfter: '.',
      };

    case 'event':
      return {
        id: item.id,
        title: 'Upcoming event',
        name: item.name,
        link: `/events/view/${id}/`,
        textBefore: 'Your event ',
        textAfter: ' is coming up on ' + formatDate(item.date) + '.',
      };
    }
  }

  async function onRefresh(done) {
    await summaryService.getItems().refresh();
    done();
  }

  onMount(() => {
    let summarySubscription;

    onLogin(() => {
      summarySubscription = summaryService.getItems().subscribe(
        is => items = is.map(translateItem));
    });

    return () => {
      summarySubscription && summarySubscription.unsubscribe();
    };
  });
</script>

<Page name="home" ptr onPtrRefresh={onRefresh}>
  <!-- Top Navbar -->
  <Navbar>
    <NavTitle>OpenInvite</NavTitle>
    <NavRight>
      <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
    </NavRight>
  </Navbar>

  <!-- Page content -->
  {#each items as item (item.id)}
    <Card>
      <CardHeader>
        {item.title}
      </CardHeader>
      <CardContent>
        {item.textBefore}<Link href={item.link}>{item.name}</Link>{item.textAfter}
      </CardContent>
    </Card>
  {:else}
    <Card>
      <CardContent>Nothing here</CardContent>
    </Card>
  {/each}
</Page>
