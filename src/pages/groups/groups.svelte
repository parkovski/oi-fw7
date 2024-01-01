<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Icon,
    Fab,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import groupService from '../../services/group';
  import { onLogin } from '../../js/onlogin';

  let groups = [];

  onMount(() => {
    const subscription = groupService.getGroups().subscribe(value => groups = value);
    onLogin(() => groupService.getGroups().refresh());

    return () => subscription.unsubscribe();
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
</script>

<Page>
  <Navbar title="Groups" />
  <List style="margin: 0" strongIos outlineIos dividers>
    {#each groups as group (group.id)}
      <ListItem link={getGroupLink(group)} title={group.name}
        footer={getFooterText(group)}>
        <Icon slot="media" ios="f7:person_3_fill" md="material:groups" />
      </ListItem>
    {/each}
  </List>
  <Fab position="right-bottom" href="/groups/new/">
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
</Page>
