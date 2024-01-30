<script>
  import {
    f7,
    Page,
    LoginScreenTitle,
    List,
    ListInput,
    ListButton,
  } from 'framework7-svelte';
  import { fetchText } from '../../js/fetch';
  import { postLoginEvent } from '../../js/onlogin';

  export let f7router;

  let username;
  let password;
  let email;
  let name;

  function setupSession(uid) {
    localStorage.setItem('uid', uid);
    f7.loginScreen.close();
    postLoginEvent();
    f7router.navigate('/blank/');
  }

  async function register() {
    const body = new URLSearchParams({
      username,
      password,
      wantsSession: 'true',
    });
    if (email && email.length) {
      body.append('email', email);
    }
    if (name && name.length) {
      body.append('name', name);
    }
    try {
      const uid = await fetchText('/register', {
        method: 'POST',
        body,
      });
      setupSession(uid);
    } catch (e) {
      console.error(e);
    }
  }

  function goBack() {
    f7router.back();
  }
</script>

<Page loginScreen>
  <LoginScreenTitle>Register</LoginScreenTitle>
  <List form>
    <ListInput type="text" name="username" placeholder="Username" bind:value={username} />
    <ListInput type="text" name="name" placeholder="Name (optional)" bind:value={name} />
    <ListInput type="email" name="email" placeholder="Email (optional)" bind:value={email} />
    <ListInput type="password" name="password" placeholder="Password" bind:value={password} />
    <div class="grid grid-cols-2 grid-gap">
      <ListButton title="Back" onClick={goBack} />
      <ListButton title="Register" onClick={register} />
    </div>
  </List>
</Page>
