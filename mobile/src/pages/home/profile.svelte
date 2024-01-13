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
    ListInput,
    ListItem,
    ListButton,
    Toggle,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { writeBarcodeToImageFile/*, type WriterOptions*/ } from 'zxing-wasm/writer';
  import profileService from '../../services/profile';

  let qrcodeUrl;
  let editing = false;
  let verified;
  let name;
  let username;
  let email;
  let phone;
  let isPublic;

  onMount(() => {
    const profileSubscription = profileService.getProfile().subscribe(p => {
      verified = p.verified;
      name = p.name;
      username = p.username;
      email = p.email;
      phone = p.phone;
      isPublic = p.public;
    });
    profileService.getProfile().then(async profile => {
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
      await profileService.updateProfile(name, username, email, phone, isPublic);
      editing = false;
    }
  }

  async function onCancelClick() {
    profileService.getProfile().refresh();
    editing = false;
  }
</script>

<style>
  #qr-container {
    width: 100%;
    text-align: center;
    margin: 2em auto;
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
      <div style="flex: 0 0 auto">
        {#if editing}
          <Button style="display: inline-block" onClick={onCancelClick}>Cancel</Button>
        {/if}
        <Button style="display: inline-block" onClick={onEditClick}>{#if editing}Save{:else}Edit{/if}</Button>
      </div>
    </CardHeader>
    <CardContent>
      {#if editing}
        <List>
          <ListInput label="Name" type="text" bind:value={name}/>
          <ListInput label="Username" type="text" bind:value={username}/>
          <ListInput label="Email" type="text" bind:value={email}/>
          <ListInput label="Phone" type="text" bind:value={phone}/>
          <ListItem>
            <span>Public</span>
            <Toggle bind:checked={isPublic} />
          </ListItem>
        </List>
      {:else}
        <List>
          <ListItem>
            <span></span>
            <span>
              {#if verified}Verified, {/if}{#if isPublic}Public{:else}Private{/if}
            </span>
          </ListItem>
          <ListItem>
            <span>Username:</span><span>{username}</span>
          </ListItem>
          {#if phone}
            <ListItem>
              <span>Phone:</span><span>{phone}</span>
            </ListItem>
          {/if}
          {#if email}
            <ListItem>
              <span>Email:</span><span>{email}</span>
            </ListItem>
          {/if}
        </List>
      {/if}
      <div id="qr-container">
        <img id="qr-code" alt="Profile QR code">
      </div>
    </CardContent>
  </Card>
</Page>
