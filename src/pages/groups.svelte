<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Icon,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import GroupsService from '../services/groups';

  let service = new GroupsService;
  let groups = [];

  onMount(() => {
    const subscription = service.subscribe(value => groups = value);

    return () => subscription.unsubscribe();
  });
</script>

<Page>
  <Navbar title="Groups" />
  <List style="margin: 0" strongIos outlineIos dividers>
    {#each groups as group (group.id)}
      <ListItem link={`/groups/${group.id}/`} title={group.name}>
        <Icon slot="media" ios="f7:person_3_fill" md="material:groups" />
      </ListItem>
    {/each}
  </List>
</Page>
