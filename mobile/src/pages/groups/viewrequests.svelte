<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';

  import groupService from '../../services/group';

  export let f7route;

  let requests = [];

  async function onRefresh(done) {
    requests = await groupService.getGroupRequests(f7route.params.id);
    done();
  }

  onMount(() => {
    onRefresh(function(){});
  })

  function approve(uid) {
    groupService.approveGroupRequest(f7route.params.id, uid).then(() => {
      requests = requests.filter(req => req.id !== uid);
    })
  }

  function deny(uid) {
    groupService.denyGroupRequest(f7route.params.id, uid).then(() => {
      requests = requests.filter(req => req.id !== uid);
    })
  }
</script>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar title="Group requests" backLink="Back" />
  <List>
    {#if requests.length === 0}
      <ListItem>
        There are no requests.
      </ListItem>
    {/if}
    {#each requests as req (req.id)}
      <ListItem>
        <div class="grid grid-gap grid-cols-3" style="width: 100%">
          <div>{req.name}</div>
          <Button fill small color="red" on:click={() => deny(req.id)}>Deny</Button>
          <Button fill small on:click={() => approve(req.id)}>Approve</Button>
        </div>
      </ListItem>
    {/each}
  </List>
</Page>
