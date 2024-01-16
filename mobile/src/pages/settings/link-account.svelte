<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
  } from 'framework7-svelte';
</script>

<Page name="link-account-settings">
  <Navbar title="Link accounts" backLink="Back" />
  <List strongIos style="margin-top: 0">
    <ListItem href="/settings/link-account/google/">Google</ListItem>
    <ListItem href="/settings/link-account/apple/">Apple</ListItem>
    <ListItem href="/settings/link-account/microsoft/">Microsoft</ListItem>
  </List>
</Page>
