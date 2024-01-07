<script>
  import {
    Page,
    Navbar,
    Block,
  } from 'framework7-svelte';
  import webSocketService from '../../services/websocket';

  function getReadyState() {
    switch (webSocketService._webSocket.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN: return 'open';
    case WebSocket.CLOSING: return 'closing';
    case WebSocket.CLOSED: return 'closed';
    default: return 'bad value';
    }
  }
</script>

<Page>
  <Navbar title="Developer Info" backLink="Back" />
  <Block>WebSocket status: {getReadyState()}</Block>
</Page>
