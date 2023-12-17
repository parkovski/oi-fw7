<script>
  import {
    Page,
    Navbar,
  } from 'framework7-svelte';

  import ChatView from '../components/chat.svelte';
</script>

<Page>
  <Navbar title="Messages" backLink="Back" />
  <div style="height: 100%">
    <ChatView />
  </div>
</Page>
