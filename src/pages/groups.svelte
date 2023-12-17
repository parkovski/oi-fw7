<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Icon,
    useStore,
  } from 'framework7-svelte';

  import { onMount } from 'svelte';
  import GroupsService from '../services/groups';

  let service;
  let groups = useStore('groups', value => groups = value);

  onMount(() => {
    service = new GroupsService();

    return () => {};
  });
</script>

<Page>
  <Navbar title="Groups" />
  <List style="margin: 0" strongIos outlineIos dividers>
    {#each groups as group}
      <ListItem link={`/groups/${group.id}/`} title={group.name}>
        <Icon slot="media" ios="f7:person_3_fill" md="material:groups" />
      </ListItem>
    {/each}
  </List>
</Page>
