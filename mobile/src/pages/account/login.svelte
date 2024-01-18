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

  function importGooglePlatform() {
    if (document.getElementById('google-platform-script')) {
      return;
    }

    const googlePlatformScript = document.createElement('script');
    googlePlatformScript.id = 'google-platform-script';
    googlePlatformScript.src = 'https://accounts.google.com/gsi/client';
    googlePlatformScript.async = true;
    googlePlatformScript.defer = true;
    googlePlatformScript.onload = function() {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: function(response) {
          console.log(response);
        }
      });
      google.accounts.id.renderButton(
        document.getElementById('google_btn'), { theme: 'filled_blue' }
      );
    };
    document.body.appendChild(googlePlatformScript);
  }

  function importApplePlatform() {
    if (document.getElementById('apple-auth-script')) {
      return;
    }

    // Note: This requires some meta tags set, see
    // https://developer.apple.com/documentation/sign_in_with_apple/displaying_sign_in_with_apple_buttons_on_the_web
    let metaTag = document.createElement('meta');
    metaTag.name = 'appleid-signin-client-id';
    metaTag.content = 'PUT_APPLE_CLIENT_ID_HERE';
    document.head.appendChild(metaTag);

    metaTag = document.createElement('meta');
    metaTag.name = 'appleid-signin-scope'
    metaTag.content = 'PUT_APPLE_SCOPE_HERE';
    document.head.appendChild(metaTag);

    metaTag = document.createElement('meta');
    metaTag.name = 'appleid-signin-redirect-uri';
    metaTag.content = 'PUT_APPLE_REDIRECT_URI_HERE';
    document.head.appendChild(metaTag);

    metaTag = document.createElement('meta');
    metaTag.name = 'appleid-signin-state';
    metaTag.content = 'PUT_APPLE_STATE_HERE';

    const appleIdButton = document.getElementById('appleid-signin');
    if (document.documentElement.classList.contains('dark')) {
      appleIdButton.setAttribute('data-color', 'white');
    } else {
      appleIdButton.setAttribute('data-color', 'black');
    }
    const appleAuthScript = document.createElement('script');
    appleAuthScript.id = 'apple-auth-script';
    appleAuthScript.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    appleAuthScript.async = true;
    appleAuthScript.defer = true;
    appleAuthScript.onload = function() {
    };
    document.body.appendChild(appleAuthScript);
  }

  function register() {
    f7router.navigate('/account/register/');
  }

  onMount(() => {
    importGooglePlatform();
    //importApplePlatform();
  });
</script>

<style>
  :global(.login-button-item .item-inner) {
    justify-content: center;
  }

  #appleid-signin {
    width: 193px;
    height: 44px;
    /*cursor: pointer;*/
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
  <List>
    <ListItem class="login-button-item">
      <div id="google_btn"></div>
    </ListItem>
    <ListItem class="login-button-item">
      <div id="appleid-signin" data-border="true" data-type="sign-in"></div>
    </ListItem>
  </List>
</Page>
