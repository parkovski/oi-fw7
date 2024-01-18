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
  import { importGooglePlatform, createMicrosoftButton } from '../../js/linkedaccounts';

  export let f7router;

  let username;
  let password;

  async function login() {
    try {
      let permissionPromise;
      if ('Notification' in window && Notification.permission !== 'granted') {
        permissionPromise = Notification.requestPermission();
      }
      const uid = await fetchText('/authorize', {
        method: 'POST',
        body: new URLSearchParams({
          u: username,
          p: password,
        }),
      });
      localStorage.setItem('uid', uid);
      f7.loginScreen.close();
      //permissionPromise && await permissionPromise;
      postLoginEvent();
      f7router.navigate('/blank/');
    }
    catch (e) {
      console.error(e);
    }
  }

  function register() {
    f7router.navigate('/account/register/');
  }

  onMount(() => {
    importGooglePlatform(response => {
      console.log(response);
    });
    //importApplePlatform();
    createMicrosoftButton();
  });
</script>

<style>
  .buttons-container {
    display: flex;
    flex-flow: column;
    align-items: center;
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
