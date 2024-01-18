<script>
  import {
    f7,
    f7ready,
    App,
    Panel,
    Views,
    View,
    Toolbar,
    Link,
    LoginScreen,
    Icon,
    Badge,
  } from 'framework7-svelte';
  import { getDevice }  from 'framework7/lite-bundle';
  import { onMount } from 'svelte';
  import { fetchText } from '../js/fetch';
  import { defineCustomElements } from '@ionic/pwa-elements/loader';
  import { base64ArrayBuffer, urlBase64ToUint8Array } from '../js/base64';

  import capacitorApp from '../js/capacitor-app';
  import routes from '../js/routes';
  import { postLoginEvent, onLogin } from '../js/onlogin';
  import chatService from '../services/chat';
  import groupService from '../services/group';
  import eventService from '../services/event';

  defineCustomElements(window);

  const device = getDevice();
  let unreadChats = 0;
  let groupUnreadChats = 0;
  let upcomingEvents = 0;

  // Framework7 Parameters
  let f7params = {
    name: 'OpenInvite', // App name
    theme: 'auto', // Automatic theme detection
    // App routes
    routes: routes,
    // Register service worker
    serviceWorker: {
      path: '/service-worker.js',
    },
    // Input settings
    input: {
      scrollIntoViewOnFocus: device.capacitor,
      scrollIntoViewCentered: device.capacitor,
    },
    // Capacitor Statusbar settings
    statusbar: {
      iosOverlaysWebView: true,
      androidOverlaysWebView: false,
    },
  };

  function onRouteChanged(newRoute, _prevRoute, _router) {
    if (newRoute.url === '/') {
      f7.views.rpanel.router.navigate('/panels/home/', { animate: false });
    } else if (newRoute.url.startsWith('/groups/view/')) {
      f7.views.rpanel.router.navigate(`/panels/group/${newRoute.params.id}/`, { animate: false });
    } else if (newRoute.url.startsWith('/events/view/')) {
      f7.views.rpanel.router.navigate(`/panels/event/${newRoute.params.id}/`, { animate: false });
    }
  }

  function openLoginScreen() {
    f7.views.loginScreen.router.navigate('/account/login/');
    f7.loginScreen.open(document.getElementById('login-screen'));
  }

  onMount(() => {
    let chatSubscription;
    let groupSubscription;
    let eventSubscription;

    f7ready(() => {
      // Init capacitor APIs (see capacitor-app.js)
      if (f7.device.capacitor) {
        capacitorApp.init(f7);
      }
      // Call F7 APIs here
      f7.enableAutoDarkMode();

      fetchText('/hello')
        .then(text => {
          let [uid, message] = text.split('\n');
          localStorage.setItem('uid', uid);
          console.log(message);
          postLoginEvent();
        })
        .catch(openLoginScreen);

      ['home', 'groups', 'events', 'contacts', 'messages'].forEach(tab =>
        f7.views[tab].router.on('routeChanged', onRouteChanged)
      );

      onLogin(async () => {
        if (!('Notification' in window) || !('serviceWorker' in navigator) ||
            !('PushManager' in window)) {
          console.warn('Push notifications not supported in this browser.');
        } else {
          const permission = Notification.permission;
          if (permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_SERVER_KEY),
              });
              const keyP256dh = subscription.getKey('p256dh');
              const keyAuth = subscription.getKey('auth');
              await fetchText('/push-endpoint', {
                method: 'PUT',
                body: new URLSearchParams({
                  endpoint: subscription.endpoint,
                  p256dh: base64ArrayBuffer(keyP256dh),
                  auth: base64ArrayBuffer(keyAuth),
                }),
              });
            }
          }
        }

        // Subscribe to messages
        chatSubscription = chatService.getChatSummary().subscribe(chats => {
          unreadChats = chats.reduce((a, c) => a + +(c.unread ?? 0), 0);
        });
        groupSubscription = groupService.getGroups().subscribe(groups => {
          groupUnreadChats = groups.reduce((a, c) => a + +(c.unreadMessages ?? 0), 0);
        });
        eventSubscription = eventService.getEvents().subscribe(events => {
          upcomingEvents = events.reduce((a, c) => {
            // Don't include events we responded "Not attending".
            if (c.startTime > new Date() && c.kind >= 0) {
              ++a;
            }
            return a;
          }, 0);
        });
      });
    });

    return () => {
      chatSubscription && chatSubscription.unsubscribe();
      groupSubscription && groupSubscription.unsubscribe();
      eventSubscription && eventSubscription.unsubscribe();
    };
  });

  let currentTab = 'home';
  function tabClick(name) {
    // Go back to the initial page only if this tab is already active and is
    // currently on a different route.
    if (f7.views.current.name !== currentTab) {
      currentTab = f7.views.current.name;
      onRouteChanged(
        f7.views.current.router.currentRoute,
        f7.views.current.router.previousRoute,
        f7.views.current.router
      );
      return;
    }
    const router = f7.views[name].router;
    const initialUrl = router.initialUrl;
    if (router.url !== initialUrl) {
      router.navigate(initialUrl, { clearPreviousHistory: true });
    }
  }
</script>

<App { ...f7params }>
  <Panel right reveal id="right-panel">
    <View id="view-rpanel" name="rpanel" url="/panels/home/" />
  </Panel>

  <!-- Views/Tabs container -->
  <Views tabs class="safe-areas">
    <!-- Tabbar for switching views-tabs -->
    <Toolbar tabbar icons bottom>
      <Link tabLink="#view-home" tabLinkActive
        iconIos="f7:house_fill" iconMd="material:home"
        text="Home"
        onClick={() => tabClick('home')}
      />
      <Link tabLink="#view-groups"
        text="Groups"
        onClick={() => tabClick('groups')}
      >
        <Icon ios="f7:person_3_fill" md="material:groups">
          {#if groupUnreadChats}
            <Badge color="red">{groupUnreadChats}</Badge>
          {/if}
        </Icon>
      </Link>
      <Link tabLink="#view-events"
        text="Events"
        onClick={() => tabClick('events')}
      >
        <Icon ios="f7:calendar" md="material:event">
          {#if upcomingEvents}
            <Badge color="blue">{upcomingEvents}</Badge>
          {/if}
        </Icon>
      </Link>
      <Link tabLink="#view-contacts"
        iconIos="f7:person_fill" iconMd="material:person"
        text="Contacts"
        onClick={() => tabClick('contacts')}
      />
      <Link tabLink="#view-messages"
        text="Messages"
        onClick={() => tabClick('messages')}
      >
        <Icon ios="f7:chat_bubble_text_fill" md="material:chat">
          {#if unreadChats}
            <Badge slot="top-right" color="red">{unreadChats}</Badge>
          {/if}
        </Icon>
      </Link>
    </Toolbar>

    <!-- Your main view/tab, should have "view-main" class. It also has "tabActive" prop -->
    <View id="view-home" name="home" main tab tabActive url="/" />
    <View id="view-groups" name="groups" tab url="/groups/" />
    <View id="view-events" name="events" tab url="/events/" />
    <View id="view-contacts" name="contacts" tab url="/contacts/" />
    <View id="view-messages" name="messages" tab url="/messages/" />
  </Views>

  <LoginScreen id="login-screen">
    <View name="loginScreen" url="/blank/" />
  </LoginScreen>
</App>
