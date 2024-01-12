<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import groupService from '../../services/group';

  export let f7route;
  export let f7router;

  let name = '(undefined)';

  async function onRefresh(done) {
    await groupService.getGroup(f7route.params.id).refresh();
    done();
  }

  onMount(() => {
    const groupSubscription =
      groupService.getGroup(f7route.params.id).subscribe(group => {
        name = group.name;
      });

    return () => {
      groupSubscription.unsubscribe();
    };
  });

  async function accept() {
    console.log(await groupService.joinGroup(f7route.params.id));
    f7router.navigate(`/groups/view/${f7route.params.id}/`, { reloadCurrent: true });
  }

  async function decline() {
    await groupService.leaveGroup(f7route.params.id);
    f7router.navigate('/groups/', { reloadCurrent: true });
  }
</script>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar title="Group Invitation" backLink="Back" />
  <Block>
    You have been invited to join the group {name}.
  </Block>
  <Block>
    <div class="grid grid-cols-2 grid-gap">
      <Button fill onClick={accept}>Accept</Button>
      <Button fill color="red" onClick={decline}>Decline</Button>
    </div>
  </Block>
</Page>
