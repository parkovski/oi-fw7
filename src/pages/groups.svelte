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

  import groupService from '../services/group';
  import { onLogin } from '../js/onlogin';

  let groups = [];

  onMount(() => {
    const subscription = groupService.getGroups().subscribe(value => groups = value);
    onLogin(() => groupService.getGroups().refresh());

    return () => subscription.unsubscribe();
  });

  function addClick() {
    console.log('Add group clicked');
  }

  function getGroupLink(group) {
    if (group.kind === 0) {
      return `/groups/viewinvite/${group.id}/`;
    }
    return `/groups/view/${group.id}/`;
  }
</script>

<Page>
  <Navbar title="Groups" />
  <Fab position="right-bottom" href="/groups/new/">
    <Icon ios="f7:plus" md="material:add" />
  </Fab>
  <List style="margin: 0" strongIos outlineIos dividers>
    {#each groups as group (group.id)}
      <ListItem link={getGroupLink(group)} title={group.name}
        footer={group.kind === 0 ? "Invited" : undefined}>
        <Icon slot="media" ios="f7:person_3_fill" md="material:groups" />
      </ListItem>
    {/each}
  </List>
</Page>
