<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
  } from 'framework7-svelte';
</script>

<Page name="account-settings">
  <Navbar title="Account settings" backLink="Back" />
  <List strongIos style="margin-top: 0">
    <ListItem href="/settings/password/">Change password</ListItem>
    <ListItem href="/settings/link-account/">Link accounts</ListItem>
  </List>
</Page>
