<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
    f7,
  } from 'framework7-svelte';
  import webSocketService from '../../services/websocket';
  import { onMount } from 'svelte';
  import { fetchText } from '../../js/fetch';

  console.log(f7);

  function getReadyState() {
    switch (webSocketService._webSocket.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN: return 'open';
    case WebSocket.CLOSING: return 'closing';
    case WebSocket.CLOSED: return 'closed';
    default: return 'bad value';
    }
  }

  let notificationPermission = Notification.permission;
  async function enableNotifications() {
    notificationPermission = await Notification.requestPermission();
  }

  function sendNotification() {
    new Notification('Test notification', {
      body: 'Test notification'
    });
  }

  let pushEndpoint;
  onMount(() => {
    if (f7.serviceWorker.registrations.length) {
      f7.serviceWorker.container.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          pushEndpoint = subscription.endpoint;
        });
      });
    }
  });

  function sendPushEndpoint() {
    fetchText('/push-endpoint', {
      method: 'PUT',
      body: new URLSearchParams({
        endpoint: pushEndpoint,
      }),
    })
  }
</script>

<Page>
  <Navbar title="Developer Info" backLink="Back" />
  <Block>WebSocket status: {getReadyState()}</Block>
  <Block>
    Notification permission: {notificationPermission}
    <div class="grid grid-cols-2 grid-gap">
      <Button onClick={enableNotifications}>Request</Button>
      <Button onClick={sendNotification}>Send notification</Button>
    </div>
  </Block>
  <Block>
    Push endpoint:
    <div style="overflow-x: scroll">{pushEndpoint}</div>
    <Button onClick={sendPushEndpoint}>Send to server</Button>
  </Block>
</Page>
