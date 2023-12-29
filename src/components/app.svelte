<script>
  import { onMount } from 'svelte';
  import { getDevice }  from 'framework7/lite-bundle';
  import {
    f7,
    f7ready,
    App,
    Panel,
    Views,
    View,
    Popup,
    Page,
    Navbar,
    Toolbar,
    NavRight,
    Link,
    Block,
    BlockTitle,
    LoginScreen,
    LoginScreenTitle,
    List,
    ListItem,
    ListInput,
    ListButton,
    BlockFooter
  } from 'framework7-svelte';

  import capacitorApp from '../js/capacitor-app';
  import routes from '../js/routes';
  import store from '../js/store';
  import { postLoginEvent, postLogoutEvent } from '../js/onlogin';

  const device = getDevice();

  // Framework7 Parameters
  let f7params = {
    name: 'OpenInvite', // App name
    theme: 'auto', // Automatic theme detection
    // App store
    store: store,
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

  onMount(() => {
    f7ready(() => {
      // Init capacitor APIs (see capacitor-app.js)
      if (f7.device.capacitor) {
        capacitorApp.init(f7);
      }
      // Call F7 APIs here
      f7.enableAutoDarkMode();

      fetch('http://localhost:3000/hello', { credentials: 'include' })
        .then(res => {
          if (!res.ok) {
            console.log(res);
            f7.loginScreen.open(document.getElementById('login-screen'));
          } else {
            res.text().then(text => console.log(text));
            postLoginEvent();
          }
        })
        .catch(e => {
          console.log(e);
          f7.loginScreen.open(document.getElementById('login-screen'));
        });
    });
  })

  let username;
  let password;

  async function login() {
    try {
      const response = await fetch('http://localhost:3000/authorize', {
        method: 'POST',
        credentials: 'include',
        body: new URLSearchParams([
          ['u', username],
          ['p', password],
        ])
      });
      console.log(response);
      f7.loginScreen.close();
      postLoginEvent();
    }
    catch (e) {
      console.log(e);
    }
  }

  async function logout() {
    try {
      const response = await fetch('http://localhost:3000/logout', {
        method: 'POST',
        credentials: 'include',
      });
      f7.panel.close('#right-panel');
      f7.loginScreen.open(document.getElementById('login-screen'));
      postLogoutEvent();
    } catch (e) {
      console.log(e);
    }
  }

  function panelNavigate(to) {
    f7.panel.close('#right-panel');
    f7.views.main.router.navigate(to);
  }

  let currentTab = 'home';
  function tabClick(name) {
    // Go back to the initial page only if this tab is already active and is
    // currently on a different route.
    if (f7.views.current.name !== currentTab) {
      currentTab = f7.views.current.name;
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
    <View>
      <Page>
        <Navbar title="Menu"/>
        <List style="margin-top: 0">
          <ListItem>
            <Link text="My Profile" onClick={() => panelNavigate('/profile/')}/>
          </ListItem>
          <ListItem>
            <Link text="Settings" onClick={() => panelNavigate('/settings/')}/>
          </ListItem>
          <ListItem>
            <Link text="About" onClick={() => panelNavigate('/about/')}/>
          </ListItem>
          <ListItem>
            <Link text="Sign out" onClick={() => logout()}/>
          </ListItem>
        </List>
      </Page>
    </View>
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