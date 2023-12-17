<script>
  import {
    Page,
    Navbar,
    NavTitle,
    NavRight,
    Link,
    Card,
    CardHeader,
    CardContent,
  } from 'framework7-svelte';
</script>

<Page name="home">
  <!-- Top Navbar -->
  <Navbar>
    <NavTitle>OpenInvite</NavTitle>
    <NavRight>
      <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
    </NavRight>
  </Navbar>

  <!-- Page content -->
  <Card>
    <CardHeader>
      Random event #12
    </CardHeader>
    <CardContent>
      This is an event you've been invited to.
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      My Party
    </CardHeader>
    <CardContent>
      I'm having a party and you're invited
    </CardContent>
  </Card>
</Page>