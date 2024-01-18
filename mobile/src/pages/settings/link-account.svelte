<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { importGooglePlatform, createMicrosoftButton } from '../../js/linkedaccounts';

  onMount(() => {
    importGooglePlatform();
    createMicrosoftButton();
  })
</script>

<style>
  .buttons-container {
    height: 100%;
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
  }
</style>

<Page name="link-account-settings">
  <Navbar title="Link accounts" backLink="Back" />
  <div class="buttons-container">
    <List strongIos style="margin-top: 0">
      <ListItem class="login-button-item"><div id="google_btn"></div></ListItem>
      <!--ListItem class="login-button-item"><div id="appleid-signin"></div></ListItem-->
      <ListItem class="login-button-item"><div id="msft-button"></div></ListItem>
    </List>
  </div>
</Page>
