<script>
  import {
    Page,
    Navbar,
    Card,
    CardHeader,
    CardContent,
    Icon,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { writeBarcodeToImageFile/*, type WriterOptions*/ } from 'zxing-wasm/writer';

  import profileService from '../services/profile';

  let profile = {};

  onMount(() => {
    const profileSubscription = profileService.getProfile().subscribe(p => profile = p);
    profileService.getProfile().ensureLoaded().then(async profile => {
      const qrcode = await writeBarcodeToImageFile(
        `openinvite-profile:${profile.id}`,
        {
          format: 'QRCode',
          width: 160,
          height: 160,
          margin: 4,
          eccLevel: 2,
        }
      );
      const img = document.getElementById('qr-code');
      const url = URL.createObjectURL(qrcode.image);
      img.src = url;
    });
    return () => profileSubscription.unsubscribe();
  });
</script>

<Page>
  <Navbar title="My Profile" backLink="Back" />
  <Card>
    <CardHeader>
      <div>
        <Icon ios="f7:person_fill" md="material:person"
          /><span style="margin-left: 8px">{profile.name}</span>
      </div>
    </CardHeader>
    <CardContent>
      {#if profile.verified}
        <p>Verified</p>
      {/if}
      <p>Username: {profile.username}</p>
      {#if profile.phone}
        <p>Phone: {profile.phone}</p>
      {/if}
      {#if profile.email}
        <p>Email: {profile.email}</p>
      {/if}
      <img id="qr-code" alt="Profile QR code">
    </CardContent>
  </Card>
</Page>
