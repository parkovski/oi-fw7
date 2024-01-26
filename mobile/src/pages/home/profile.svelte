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
    Toggle,
    f7,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { writeBarcodeToImageFile/*, type WriterOptions*/ } from 'zxing-wasm/writer';
  import { Camera, CameraResultType, CameraDirection, CameraSource } from '@capacitor/camera';
  import { fetchText } from '../../js/fetch';
  import selectPhotos from '../../js/selectphotos';
  import profileService from '../../services/profile';

  let qrcodeUrl;
  let editing = false;
  let verified;
  let name;
  let username;
  let email;
  let phone;
  let isPublic;
  let editPicActions;
  let profilePhoto;

  onMount(() => {
    const profileSubscription = profileService.getProfile().subscribe(p => {
      verified = p.verified;
      name = p.name;
      username = p.username;
      email = p.email;
      phone = p.phone;
      isPublic = p.public;
      profilePhoto = p.avatarUrl ? `https://api.oi.parkovski.com/uploads/${p.avatarUrl}` : null;
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
      editPicActions && editPicActions.destroy();
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

  async function takePicture() {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        direction: CameraDirection.Front,
      });
      // TODO Upload the file with capacitor filesystem.
      //profilePhoto = photo.webPath;
    } catch {
    }
  }

  async function uploadPictureCapacitor() {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      // TODO Upload the file with capacitor filesystem.
      //profilePhoto = photo.webPath;
    } catch {
    }
  }

  async function uploadPicture() {
    if (f7.device.capacitor) {
      return uploadPictureCapacitor();
    } else {
      selectPhotos(async function(file) {
        const formData = new FormData;
        formData.append('photo', file);
        try {
          const filename = await fetchText('/profile/photo', {
            method: 'PUT',
            body: formData,
          });
          profilePhoto = `https://api.oi.parkovski.com/uploads/${filename}`;
        } catch {
        }
      });
    }
  }

  function editPicture() {
    if (!editPicActions) {
      editPicActions = f7.actions.create({
        buttons: [
          {
            text: 'Edit profile photo',
            label: true,
          },
          {
            text: 'Take picture',
            onClick: takePicture,
          },
          {
            text: 'From gallery',
            onClick: uploadPicture,
          },
          {
            text: 'Cancel',
            color: 'red',
          },
        ],
        targetEl: document.getElementById('edit-profile-pic-button'),
      });
    }
    editPicActions.open();
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
        {#if profilePhoto}<img
          src={profilePhoto} alt="Profile" width="48" height="48"
          style="border-radius: 100px; vertical-align: middle"
        >{:else}<Icon ios="f7:person_fill" md="material:person"
        />{/if}{#if editing}<Button
          id="edit-profile-pic-button"
          style="display: inline-block"
          onClick={editPicture}
        >
          Edit picture
        </Button>{:else}<span style="margin-left: 8px">@{username}</span>{/if}
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
          <ListInput label="Username" type="text" bind:value={username}/>
          <ListInput label="Name" type="text" bind:value={name}/>
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
            <span>Name:</span><span>{name}</span>
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
