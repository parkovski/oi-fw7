<script>
  import {
    f7,
    f7ready,
    App,
    Panel,
    Views,
    View,
    Page,
    Toolbar,
    Link,
    LoginScreen,
    LoginScreenTitle,
    List,
    ListInput,
    ListButton,
    BlockFooter
  } from 'framework7-svelte';
  import { getDevice }  from 'framework7/lite-bundle';
  import { onMount } from 'svelte';
  import { fetchText } from '../js/fetch';

  import capacitorApp from '../js/capacitor-app';
  import routes from '../js/routes';
  import { postLoginEvent, onLogin } from '../js/onlogin';

  const device = getDevice();

  // Framework7 Parameters
  let f7params = {
    name: 'OpenInvite', // App name
    theme: 'auto', // Automatic theme detection
    // App routes
    routes: routes,
    // Register service worker (only on production build)
    serviceWorker: process.env.NODE_ENV ==='production' ? {
      path: '/service-worker.js',
    } : {},
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

  onMount(() => {
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
        .catch(e => {
          console.log(e);
          f7.loginScreen.open(document.getElementById('login-screen'));
        });

      ['home', 'groups', 'events', 'contacts', 'messages'].forEach(tab =>
        f7.views[tab].router.on('routeChanged', onRouteChanged)
      );
    });
  });

  function urlBase64ToUint8Array(base64String) {
    // Thanks to https://gist.github.com/Klerith/80abd742d726dd587f4bd5d6a0ab26b6
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  let username;
  let password;

  async function login() {
    try {
      const uid = await fetchText('/authorize', {
        method: 'POST',
        body: new URLSearchParams({
          u: username,
          p: password,
        }),
      });
      localStorage.setItem('uid', uid);
      f7.loginScreen.close();
      if (process.env.NODE_ENV === 'production') {
        let permission = Notification.permission;
        if ('Notification' in window && Notification.permission !== 'granted') {
          permission = await Notification.requestPermission();
        }
        if (permission === 'granted' && f7.serviceWorker.registrations.length) {
          const registration = await f7.serviceWorker.container.ready;
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_SERVER_KEY),
            });
            await fetchText('/push-endpoint', {
              method: 'PUT',
              body: new URLSearchParams({
                endpoint: subscription.endpoint,
              }),
            });
          }
        }
      }
      postLoginEvent();
    }
    catch (e) {
      console.log(e);
    }
  }

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
        iconIos="f7:person_3_fill" iconMd="material:groups"
        text="Groups"
        onClick={() => tabClick('groups')}
      />
      <Link tabLink="#view-events"
        iconIos="f7:calendar" iconMd="material:event"
        text="Events"
        onClick={() => tabClick('events')}
      />
      <Link tabLink="#view-contacts"
        iconIos="f7:person_fill" iconMd="material:person"
        text="Contacts"
        onClick={() => tabClick('contacts')}
      />
      <Link tabLink="#view-messages"
        iconIos="f7:chat_bubble_text_fill" iconMd="material:chat"
        text="Messages"
        onClick={() => tabClick('messages')}
      />
    </Toolbar>

    <!-- Your main view/tab, should have "view-main" class. It also has "tabActive" prop -->
    <View id="view-home" name="home" main tab tabActive url="/" />
    <View id="view-groups" name="groups" tab url="/groups/" />
    <View id="view-events" name="events" tab url="/events/" />
    <View id="view-contacts" name="contacts" tab url="/contacts/" />
    <View id="view-messages" name="messages" tab url="/messages/" />
  </Views>

  <LoginScreen id="login-screen">
    <View>
      <Page loginScreen>
        <LoginScreenTitle>Login</LoginScreenTitle>
        <List form>
          <ListInput
            type="text"
            name="username"
            placeholder="Your username"
            bind:value={username}
          />
          <ListInput
            type="password"
            name="password"
            placeholder="Your password"
            bind:value={password}
          />
        </List>
        <List>
          <ListButton title="Sign In" onClick={login} />
        </List>
        <BlockFooter>
          Some text about login information.<br />Click "Sign In" to close Login Screen
        </BlockFooter>
      </Page>
    </View>
  </LoginScreen>
</App>
