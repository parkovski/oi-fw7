<script>
  import {
    Page,
    LoginScreenTitle,
    List,
    ListInput,
    ListButton,
    ListItem,
  } from 'framework7-svelte';

  export let f7router;

  let username;
  let password;

  function register() {
  }

  function goBack() {
    f7router.back();
  }
</script>

<Page loginScreen>
  <LoginScreenTitle>Register</LoginScreenTitle>
  <List form>
    <ListInput type="text" name="username" placeholder="Username" bind:value={username} />
    <ListInput type="password" name="password" placeholder="Password" bind:value={password} />
    <div class="grid grid-cols-2 grid-gap">
      <ListButton title="Back" onClick={goBack} />
      <ListButton title="Register" onClick={register} />
    </div>
  </List>
  <!-- This empty list is to make the form be at the same height as the login form -->
  <List>
    <ListItem>
      <div style="height: 44px"></div>
    </ListItem>
    <ListItem>
      <div style="height: 44px"></div>
    </ListItem>
  </List>
</Page>
