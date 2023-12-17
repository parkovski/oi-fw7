<script>
  import {
    Page,
    Navbar,
    Card,
    CardHeader,
    CardContent,
    Icon,
  } from 'framework7-svelte';
</script>

<Page>
  <Navbar title="My Profile" backLink="Back" />
  <Card>
    <CardHeader>
      <div>
        <Icon ios="f7:person_fill" md="material:person"
          /><span style="margin-left: 8px">Me</span>
      </div>
    </CardHeader>
    <CardContent>
      <p>Username: (unknown)</p>
      <p>Phone: (555)555-5555</p>
      <p>Email: foo@bar.com</p>
    </CardContent>
  </Card>
</Page>
