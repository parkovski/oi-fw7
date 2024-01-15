<script>
  import {
    f7,
    Page,
    Navbar,
    List,
    ListInput,
    ListButton,
  } from 'framework7-svelte';
  import { fetchAny } from '../../js/fetch';

  let currentPassword;
  let newPassword;
  let confirmPassword;

  async function changePassword() {
    try {
      await fetchAny('/settings/password', {
        method: 'POST',
        body: new URLSearchParams({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      f7.dialog.alert('Password updated.');
    } catch (e) {
      f7.dialog.alert(e.message);
    }
  }
</script>

<Page name="password-settings">
  <Navbar title="Password settings" backLink="Back" />
  <List strongIos style="margin-top: 0">
    <ListInput type="password" label="Current password" bind:value={currentPassword} />
    <ListInput type="password" label="New password" bind:value={newPassword} />
    <ListInput type="password" label="Confirm new password" bind:value={confirmPassword} />
    <ListButton onClick={changePassword}>Change password</ListButton>
  </List>
</Page>
