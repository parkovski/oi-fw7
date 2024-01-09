<script>
  import {
    List,
    ListItem,
    Icon,
    Button,
  } from 'framework7-svelte';
  import { beforeUpdate } from 'svelte';

  export let contacts = [];
  export let onApprove;
  export let onDeny;

  let firstLetters = [];
  let contactsByFirstLetter = {};

  beforeUpdate(() => {
    const first = [];
    const contactsByFirst = {};
    contacts.forEach(contact => {
      let firstLetter = contact.name.charAt(0);
      if (!(firstLetter in contactsByFirst)) {
        first.push(firstLetter);
        contactsByFirst[firstLetter] = [contact];
      } else {
        contactsByFirst[firstLetter].push(contact);
      }
    });
    firstLetters = first.sort();
    contactsByFirstLetter = contactsByFirst;
  });
</script>

<List style="margin-top: 0" strongIos outlineIos dividers contactsList>
  {#each firstLetters as firstLetter (firstLetter)}
    <ListItem title={firstLetter} groupTitle />
    {#each contactsByFirstLetter[firstLetter] as contact (contact.id)}
      <ListItem title={contact.name} href={`/contacts/view/${contact.id}/`}
        footer={contact.kind === 0 ? 'Requested' : undefined}>
        <Icon slot="media" ios="f7:person_fill" md="material:person" />
        <Button fill color="red" on:click={() => onDeny(contact.id)}>Deny</Button>
        <Button fill on:click={() => onApprove(contact.id)}>Approve</Button>
      </ListItem>
    {/each}
  {/each}
</List>
