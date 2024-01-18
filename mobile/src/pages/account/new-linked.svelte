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
  export let provider;
  export let id;

  let username;

  async function register() {
    try {
      const uid = await fetchText('/register/linked', {
        method: 'POST',
        body: new URLSearchParams({
          username,
          provider: `${provider}:${id}`,
        }),
      });

      localStorage.setItem('uid', uid);
      f7.loginScreen.close();
      postLoginEvent();
      f7router.navigate('/blank/');
    } catch (e) {
      console.error(e);
    }
  }
</script>

<Page name="account-new-linked">
  <LoginScreenTitle>Choose a user name</LoginScreenTitle>
  <List form>
    <ListInput type="text" name="username" placeholder="Username" bind:value={username} />
    <ListButton title="Create account" onClick={register} />
  </List>
</Page>
