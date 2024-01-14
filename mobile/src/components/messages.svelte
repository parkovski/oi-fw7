<script>
  import {
    List,
    ListItem,
    Icon,
    Badge,
  } from 'framework7-svelte';

  export let messages = [];

</script>

<List style="margin-top: 0" strongIos outlineIos dividers>
  {#each messages as message (message.uid)}
    <ListItem title={message.name} href={`/messages/view/${message.uid}/`}>
      <div slot="media">
        {#if message.avatarUrl}
          <img src={`https://api.oi.parkovski.com/uploads/${message.avatarUrl}`}
            alt="Profile" width="24" height="24"
            style="border-radius: 100px; vertical-align: middle"
          >
        {:else}
          <Icon ios="f7:person_fill" md="material:person" />
        {/if}
      </div>
      {#if message.unread}
        <Badge color="red">{message.unread}</Badge>
      {/if}
    </ListItem>
  {/each}
</List>
