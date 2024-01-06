<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Link,
    f7,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import groupService from '../../services/group';

  export let f7route;

  let group = {};

  function panelNavigate(to) {
    const gid = f7.views.groups.router.currentRoute.params.id;
    f7.panel.close('#right-panel');
    f7.views.groups.router.navigate(`${to}${gid}/`);
  }

  async function leaveGroup() {
    const gid = f7.views.groups.router.currentRoute.params.id;
    await groupService.leaveGroup(gid);
    f7.panel.close('#right-panel');
    f7.views.groups.router.navigate(`/groups/`);
  }

  async function deleteGroup() {
    const gid = f7.views.groups.router.currentRoute.params.id;
    await groupService.deleteGroup(gid);
    f7.panel.close('#right-panel');
    f7.views.groups.router.navigate('/groups/');
  }

  let confirmLeaveActions;
  async function confirmLeaveGroup() {
    if (!confirmLeaveActions) {
      confirmLeaveActions = f7.actions.create({
        buttons: [
          {
            text: 'Leave group?',
            label: true,
          },
          {
            text: 'Leave',
            color: 'red',
            onClick: leaveGroup,
          },
          {
            text: 'Cancel',
            onClick: () => confirmLeaveActions.close(),
          },
        ],
        targetEl: document.querySelector('#confirm-leave-group'),
      });
    }
    confirmLeaveActions.open();
  }

  let confirmDeleteActions;
  async function confirmDeleteGroup() {
    if (!confirmDeleteActions) {
      confirmDeleteActions = f7.actions.create({
        buttons: [
          {
            text: 'Delete group?',
            label: true,
          },
          {
            text: 'Delete',
            color: 'red',
            onClick: deleteGroup,
          },
          {
            text: 'Cancel',
            onClick: () => confirmDeleteActions.close(),
          },
        ],
        targetEl: document.querySelector('#confirm-delete-group'),
      });
    }
    confirmDeleteActions.open();
  }

  onMount(() => {
    const groupSubscription =
      groupService.getGroup(f7route.params.id).subscribe(value => group = value);

    return () => {
      groupSubscription.unsubscribe();
      confirmLeaveActions && confirmLeaveActions.destroy();
      confirmDeleteActions && confirmDeleteActions.destroy();
    }
  })
</script>

<Page>
  <Navbar title="Menu"/>
  <List style="margin-top: 0">
    <ListItem>
      <Link text="Invite contacts" onClick={() => panelNavigate('/groups/invite/')} />
    </ListItem>
    {#if group.memberKind === 2}
      <ListItem>
        <Link text="View join requests" onClick={() => panelNavigate('/groups/requests/')} />
      </ListItem>
    {/if}
    <ListItem>
      <Link id="confirm-leave-group" text="Leave group" color="red" onClick={confirmLeaveGroup} />
    </ListItem>
    {#if group.memberKind === 2}
      <ListItem>
        <Link id="confirm-delete-group" text="Delete group" color="red"
          onClick={confirmDeleteGroup} />
      </ListItem>
    {/if}
  </List>
</Page>
