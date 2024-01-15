<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
  } from 'framework7-svelte';
</script>

<Page name="settings">
  <Navbar title="Settings" backLink="Back" />
  <List strongIos style="margin-top: 0">
    <ListItem href="/settings/account/">
      Account
    </ListItem>
    <ListItem href="/settings/notifications/">
      Notifications
    </ListItem>
  </List>
</Page>
