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

  import profileService from '../services/profile';

  let profile = {};
  onMount(() => {
    const subscription = profileService.getProfile().subscribe(p => profile = p);
    return () => subscription.unsubscribe();
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
    </CardContent>
  </Card>
</Page>
