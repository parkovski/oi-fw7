<script>
  import {
    Page,
    Navbar,
    Card,
    CardHeader,
    CardContent,
    Icon,
    useStore,
  } from 'framework7-svelte';

  export let f7route;

  let contacts = useStore('contacts', v => contacts = v);
  let contact = contacts[+f7route.params.id];
</script>

<Page>
  <Navbar title="Contact" backLink="Back" />
  <Card>
    <CardHeader>
      <div>
        <Icon ios="f7:person_fill" md="material:person"
          /><span style="margin-left: 8px">{contact.name}</span>
      </div>
    </CardHeader>
    <CardContent>
      <p>Username: {contact.username}</p>
      <p>Phone: (555)555-5555</p>
      <p>Email: foo@bar.com</p>
    </CardContent>
  </Card>
</Page>
