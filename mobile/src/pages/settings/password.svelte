<script>
  import {
    Page,
    Navbar,
    List,
    ListInput,
    ListButton,
  } from 'framework7-svelte';
</script>

<Page name="password-settings">
  <Navbar title="Password settings" backLink="Back" />
  <List strongIos style="margin-top: 0">
    <ListInput type="password" label="Current password" />
    <ListInput type="password" label="New password" />
    <ListInput type="password" label="Confirm new password" />
    <ListButton>Change password</ListButton>
  </List>
</Page>
