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
    Button,
    Icon,
  } from 'framework7-svelte';
  import summaryService from '../../services/summary';
  import { onMount } from 'svelte';
  import { onLogin } from '../../js/onlogin';

  let items = [];
  let searchInput;

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

  function clearSearch() {
    searchInput.value = '';
  }

  function search() {
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

<style>
  .search-container {
    display: flex;
    flex-flow: row;
    /*margin: 16px 0 16px 16px;*/
    align-items: center;
  }
</style>

<Page name="home" ptr onPtrRefresh={onRefresh}>
  <!-- Top Navbar -->
  <Navbar>
    <NavTitle>OpenInvite</NavTitle>
    <NavRight>
      <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
    </NavRight>
  </Navbar>

  <Card>
    <CardContent style="padding-right: 4px">
      <div class="search-container">
        <input type="text" placeholder="Search"
          style="flex: 1 0 auto; font-size: 110%"
          bind:this={searchInput} />
        <Button style="flex: 0 0 auto; padding: 0 4px" onClick={clearSearch}>
          <Icon ios="f7:xmark" md="material:clear" />
        </Button>
        <Button style="flex: 0 0 auto;" onClick={search}>
          <Icon ios="f7:search" md="material:search" />
        </Button>
      </div>
    </CardContent>
  </Card>

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
  {/each}
</Page>
