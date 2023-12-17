<script>
  import {
    List,
    ListItem,
    Icon,
  } from 'framework7-svelte';

  export let messages = [];

  function getIosIcon(message) {
    if (message.from.userId) return 'f7:person_fill';
    if (message.from.groupId) return 'f7:person_3_fill';
    if (message.from.eventId) return 'f7:calendar';
  }

  function getMdIcon(message) {
    if (message.from.userId) return 'material:person';
    if (message.from.groupId) return 'material:groups';
    if (message.from.eventId) return 'material:event';
  }
</script>

<List style="margin-top: 0" strongIos outlineIos dividers>
  {#each messages as message (message.id)}
    <ListItem title={message.from.name} href={`/messages/${message.id}/`}>
      <Icon slot="media" ios={getIosIcon(message)} md={getMdIcon(message)} />
    </ListItem>
  {/each}
</List>
