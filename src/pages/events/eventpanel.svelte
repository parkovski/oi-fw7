<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Link,
    f7,
  } from 'framework7-svelte';

  function panelNavigate(to) {
    const eid = f7.views.events.router.currentRoute.params.id;
    f7.panel.close('#right-panel');
    f7.views.events.router.navigate(`${to}${eid}/`);
  }
</script>

<Page>
  <Navbar title="Menu" />
  <List style="margin-top: 0">
    <ListItem>
      <Link text="Invite contacts" onClick={() => panelNavigate('/events/invite/')} />
    </ListItem>
  </List>
</Page>
