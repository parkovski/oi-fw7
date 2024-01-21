<script>
  import {
    f7,
    Page,
    LoginScreenTitle,
    List,
    ListInput,
    ListButton,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { fetchText } from '../../js/fetch';
  import { postLoginEvent } from '../../js/onlogin';
  import { importGooglePlatform, importMicrosoftPlatform } from '../../js/linkedaccounts';

  export let f7router;

  let username;
  let password;

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  function setupSession(uid) {
    localStorage.setItem('uid', uid);
    f7.loginScreen.close();
    postLoginEvent();
    f7router.navigate('/blank/');
  }

  async function login() {
    try {
      requestNotificationPermission();
      const uid = await fetchText('/authorize', {
        method: 'POST',
        body: new URLSearchParams({
          u: username,
          p: password,
        }),
      });
      setupSession(uid);
    }
    catch (e) {
      console.error(e);
    }
  }

  function register() {
    f7router.navigate('/account/register/');
  }

  function linkedAccountLogin(provider, idRegex, getCredential) {
    return function(response) {
      requestNotificationPermission();
      fetchText(`/auth/${provider}`, {
        method: 'POST',
        body: new URLSearchParams({ credential: getCredential(response) }),
      }).then(uid => {
        let re = idRegex.exec(uid);
        if (re) {
          // New account flow
          const id = re[1];
          f7router.navigate('/account/new-linked', { props: { provider, id } });
        } else {
          setupSession(uid);
        }
      }).catch(console.error);
    };
  }

  onMount(() => {
    importGooglePlatform(
      linkedAccountLogin('google', /^google:([0-9]+)$/, res => res.credential)
    );
    importMicrosoftPlatform(
      linkedAccountLogin('microsoft', /^microsoft:([a-zA-Z0-9]+)$/, res => res.idToken)
    );
    //importApplePlatform();
  });
</script>

<style>
  .buttons-container {
    display: flex;
    flex-flow: column;
    align-items: center;
  }
  :global(.login-button-item .item-inner) {
    justify-content: center;
  }
</style>

<Page loginScreen>
  <LoginScreenTitle>OpenInvite Login</LoginScreenTitle>
  <List form>
    <ListInput
      type="text"
      name="username"
      placeholder="Username"
      bind:value={username}
    />
    <ListInput
      type="password"
      name="password"
      placeholder="Password"
      bind:value={password}
    />
    <div class="grid grid-cols-2 grid-gap">
      <ListButton title="Register" onClick={register} />
      <ListButton title="Sign In" onClick={login} />
    </div>
  </List>
  <div class="buttons-container">
    <List>
      <ListItem class="login-button-item">
        <div id="google_btn"></div>
      </ListItem>
      <!--ListItem class="login-button-item">
        <div id="appleid-signin" data-border="true" data-type="sign-in"></div>
      </ListItem-->
      <ListItem class="login-button-item">
        <div id="msft-button"></div>
      </ListItem>
    </List>
  </div>
</Page>
