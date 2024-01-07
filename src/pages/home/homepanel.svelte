<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Link,
    f7,
  } from 'framework7-svelte';
  import { postLogoutEvent } from '../../js/onlogin';
  import { fetchAny } from '../../js/fetch';

  function panelNavigate(to) {
    f7.panel.close('#right-panel');
    f7.views.main.router.navigate(to);
  }

  async function logout() {
    try {
      await fetchAny('/logout', { method: 'POST' });
      localStorage.removeItem('uid');
      f7.panel.close('#right-panel');
      f7.loginScreen.open(document.getElementById('login-screen'));
      postLogoutEvent();
    } catch (e) {
      console.log(e);
    }
  }
</script>

<Page>
  <Navbar title="Menu"/>
  <List style="margin-top: 0">
    <ListItem>
      <Link text="My Profile" onClick={() => panelNavigate('/profile/')}/>
    </ListItem>
    <ListItem>
      <Link text="Scan QR Code" onClick={() => panelNavigate('/qrcode/')}/>
    </ListItem>
    <ListItem>
      <Link text="Settings" onClick={() => panelNavigate('/settings/')}/>
    </ListItem>
    <ListItem>
      <Link text="About" onClick={() => panelNavigate('/about/')}/>
    </ListItem>
    {#if process.env.NODE_ENV !== 'production'}
      <ListItem>
        <Link text="Developer" onClick={() => panelNavigate('/developer/')}/>
      </ListItem>
    {/if}
    <ListItem>
      <Link class="color-red" text="Sign out" onClick={() => logout()}/>
    </ListItem>
  </List>
</Page>
