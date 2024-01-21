<script>
  import {
    f7,
    Page,
    Navbar,
    List,
    ListItem,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { importGooglePlatform, importMicrosoftPlatform } from '../../js/linkedaccounts';
  import { fetchText } from '../../js/fetch';

  onMount(() => {
    importGooglePlatform(response => {
      fetchText('/auth/google/credential', {
        method: 'PUT',
        body: new URLSearchParams({ credential: response.credential }),
      }).then(() => {
        f7.dialog.alert('Google account linked.', 'OpenInvite');
      });
    });
    importMicrosoftPlatform(response => {
      fetchText('/auth/microsoft/credential', {
        method: 'PUT',
        body: new URLSearchParams({ credential: response.idToken }),
      }).then(() => {
        f7.dialog.alert('Microsoft account linked', 'OpenInvite');
      });
    });
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
  :global(.login-button-item .item-inner) {
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
