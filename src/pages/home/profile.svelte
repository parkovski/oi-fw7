<script>
  import {
    Page,
    Navbar,
    Card,
    CardHeader,
    CardContent,
    Icon,
    Button,
    List,
    ListItem,
    ListInput,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { writeBarcodeToImageFile/*, type WriterOptions*/ } from 'zxing-wasm/writer';
  import profileService from '../../services/profile';
  import { fetchAny } from '../../js/fetch';

  let qrcodeUrl;
  let editing = false;
  let verified;
  let name;
  let username;
  let email;
  let phone;

  onMount(() => {
    const profileSubscription = profileService.getProfile().subscribe(p => {
      verified = p.verified;
      name = p.name;
      username = p.username;
      email = p.email;
      phone = p.phone;
    });
    profileService.getProfile().get().then(async profile => {
      const qrcode = await writeBarcodeToImageFile(
        `openinvite:profile/${profile.id}`,
        {
          format: 'QRCode',
          width: 160,
          height: 160,
          margin: 4,
          eccLevel: 2,
        }
      );
      const img = document.getElementById('qr-code');
      qrcodeUrl = URL.createObjectURL(qrcode.image);
      img.src = qrcodeUrl;
    });
    return () => {
      profileSubscription.unsubscribe();
      qrcodeUrl && URL.revokeObjectURL(qrcodeUrl);
    };
  });

  async function onEditClick() {
    if (!editing) {
      editing = true;
    } else {
      await fetchAny(`/profile/update`, {
        method: 'POST',
        body: new URLSearchParams({
          name: name ?? '',
          username: username ?? '',
          email: email ?? '',
          phone: phone ?? '',
        }),
      });
      profileService.getProfile().refresh();
      editing = false;
    }
  }
</script>

<style>
  #qr-container {
    width: 100%;
    text-align: center;
    margin-top: 2em;
  }
</style>

<Page>
  <Navbar title="My Profile" backLink="Back" />
  <Card>
    <CardHeader>
      <div>
        <Icon ios="f7:person_fill" md="material:person"
          /><span style="margin-left: 8px">{name}</span>
      </div>
      <Button onClick={onEditClick}>{#if editing}Save{:else}Edit{/if}</Button>
    </CardHeader>
    <CardContent>
      {#if editing}
        <List>
          <ListInput label="Name" type="text" bind:value={name}/>
          <ListInput label="Username" type="text" bind:value={username}/>
          <ListInput label="Email" type="text" bind:value={email}/>
          <ListInput label="Phone" type="text" bind:value={phone}/>
        </List>
      {:else}
        {#if verified}
          <p>Verified</p>
        {/if}
        <p>Username: {username}</p>
        {#if phone}
          <p>Phone: {phone}</p>
        {/if}
        {#if email}
          <p>Email: {email}</p>
        {/if}
      {/if}
      <div id="qr-container">
        <img id="qr-code" alt="Profile QR code">
      </div>
    </CardContent>
  </Card>
</Page>
