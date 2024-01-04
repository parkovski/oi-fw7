<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Icon,
    Fab,
    Badge,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import groupService from '../../services/group';
  import { onLogin } from '../../js/onlogin';

  let groups = [];

  onMount(() => {
    let groupsSubscription;
    onLogin(() => {
      groupsSubscription = groupService.getGroups().subscribe(value => groups = value);
    })

    return () => {
      groupsSubscription && groupsSubscription.unsubscribe();
    }
  });

  function getGroupLink(group) {
    if (group.memberKind === 0) {
      return `/groups/viewinvite/${group.id}/`;
    }
    return `/groups/view/${group.id}/`;
  }

  function getFooterText(group) {
    switch (group.memberKind) {
    case -1:
      return 'Requested';
    case 0:
      return 'Invited';
    default:
      return;
    }
  }

  function getBadge() {
    if (Math.random() > .5) {
      return Math.ceil(Math.random() * 10);
    }
  }
</script>

<Page>
  <Navbar title="Groups" />
  <List style="margin: 0" strongIos outlineIos dividers>
    {#each groups as group (group.id)}
      <ListItem link={getGroupLink(group)} title={group.name}
        footer={getFooterText(group)}>
        <Icon slot="media" ios="f7:person_3_fill" md="material:groups" />
        <Badge color="red">{getBadge()}</Badge>
      </ListItem>
    {/each}
  </List>
  <Fab position="right-bottom" href="/groups/new/">
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
</Page>
