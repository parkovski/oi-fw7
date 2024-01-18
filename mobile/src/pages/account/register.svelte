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

<style>
  .phantom-button {
    /* Needs to match the height of the buttons on the login screen */
    height: 44px;
  }
</style>

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
      <div class="phantom-button"></div>
    </ListItem>
    <!-- Uncomment this when the Apple signin button is added -->
    <!--ListItem>
      <div class="phantom-button"></div>
    </ListItem-->
    <ListItem>
      <div class="phantom-button"></div>
    </ListItem>
  </List>
</Page>
