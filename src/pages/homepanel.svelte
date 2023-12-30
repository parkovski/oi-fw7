<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Link,
    f7,
  } from 'framework7-svelte';
  import { postLogoutEvent } from '../js/onlogin';

  function panelNavigate(to) {
    f7.panel.close('#right-panel');
    f7.views.main.router.navigate(to);
  }

  async function logout() {
    try {
      await fetch('http://localhost:3000/logout', {
        method: 'POST',
        credentials: 'include',
      });
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
      <Link text="Scan QR code" onClick={() => panelNavigate('/qrcode/')}/>
    </ListItem>
    <ListItem>
      <Link text="Settings" onClick={() => panelNavigate('/settings/')}/>
    </ListItem>
    <ListItem>
      <Link text="About" onClick={() => panelNavigate('/about/')}/>
    </ListItem>
    <ListItem>
      <Link text="Sign out" onClick={() => logout()}/>
    </ListItem>
  </List>
</Page>
