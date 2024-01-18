<script>
  import {
    Page,
    Navbar,
    Block,
  } from 'framework7-svelte';
  import { fetchAny } from '../../js/fetch';

  const googlePlatformScript = document.createElement('script');
  googlePlatformScript.src = 'https://accounts.google.com/gsi/client';
  googlePlatformScript.async = true;
  googlePlatformScript.defer = true;
  googlePlatformScript.onload = function() {
    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: function(response) {
        console.log(response);
        fetchAny(`/auth/google/credential`, {
          method: 'PUT',
          body: new URLSearchParams({ credential: response.credential }),
        });
      },
    });
    google.accounts.id.renderButton(document.getElementById('google_btn'), { theme: 'filled_blue' });
    google.accounts.id.prompt();
  };
  document.body.appendChild(googlePlatformScript);
</script>

<Page name="link-google-account">
  <Navbar title="Link accounts" backLink="Back" />
  <Block>
    <div id="google_btn"></div>
  </Block>
</Page>
