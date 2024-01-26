<script>
  import {
    Page,
    Navbar,
    NavTitle,
    NavRight,
    Link,
    Block,
    Button,
    Segmented,
    List,
    ListItem,
    Icon,
    TextEditor,
    Fab,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import eventService from '../../services/event';
  import { formatTimeRange, formatDate } from '../../js/timeutils';
  import innerTextPolyfill from '../../js/innertext';
  import selectPhotos from '../../js/selectphotos';
  import { fetchText } from '../../js/fetch';
  import PhotoGallery from '../../components/photogallery.svelte';

  export let f7route;

  let event = { loading: true };
  let attendance = {
    hosts: [],
    attending: [],
    maybeAttending: [],
    notAttending: [],
    invited: [],
  };
  let textEditor;
  let photos;

  function sortAttendance(members) {
    attendance = {
      hosts: [],
      attending: [],
      maybeAttending: [],
      notAttending: [],
      invited: [],
    };
    for (let member of members) {
      switch (member.kind) {
        case -1:
          attendance.notAttending.push(member);
          break;
        case 0:
          attendance.invited.push(member);
          break;
        case 1:
          attendance.maybeAttending.push(member);
          break;
        case 2:
          attendance.attending.push(member);
          break;
        case 3:
          attendance.hosts.push(member);
          break;
      }
    }
  }

  function uploadPhotos() {
    selectPhotos(async function(files) {
      if (!photos) {
        photos = [];
      }
      for (let i = 0; i < files.length; ++i) {
        const formData = new FormData;
        formData.append(`photo`, files[i]);
        try {
          const filename = await fetchText(`/events/${f7route.params.id}/photo`, {
            method: 'PUT',
            body: formData,
          });
          photos = photos.concat(filename);
          event = event;
        } catch (e) {
          console.error(e);
          break;
        }
      }
    }, true);
  }

  let currentButton = 'event';
  function changeView(view) {
    return function() {
      const oldButton = document.getElementById(`${currentButton}Button`);
      const newButton = document.getElementById(`${view}Button`);
      if (oldButton === newButton) {
        return;
      }
      oldButton.classList.remove('button-fill');
      newButton.classList.add('button-fill');
      currentButton = view;
    };
  }

  function setAttendance(kind) {
    return function() {
      eventService.setAttendance(event.id, kind);
    }
  }

  async function postComment() {
    const instance = textEditor.instance();
    let text = instance.contentEl.innerText || innerTextPolyfill(instance.contentEl);
    text = text.trim();
    instance.clearValue();
    if (text === '') {
      return;
    }
    await eventService.postComment(f7route.params.id, text);
  }

  async function onRefresh(done) {
    await eventService.getEvent(f7route.params.id).refresh();
    done();
  }

  onMount(() => {
    const eventSubscription =
      eventService.getEvent(f7route.params.id).subscribe(e => {
        event = e;
        photos = e.photos;
        sortAttendance(e.members);
      });

    return () => {
      eventSubscription.unsubscribe();
    };
  });
</script>

<style>
  .comments-section, .editor-section {
    padding: .5em calc(var(--f7-list-item-padding-horizontal) + var(--f7-safe-area-left)) 0;
  }
  .editor-section {
    display: flex;
    flex-flow: row;
    align-items: flex-end;
    padding-top: 1em;
    padding-bottom: .5em;
  }
  :global(.ios .comments-send-button) {
    padding-bottom: .75em;
  }
  .comment-box {
    display: flex;
    flex-flow: row;
    align-items: center;
  }
  :global(.comment-box > i, .comment-box img) {
    margin-right: 16px;
  }
  .author {
    font-size: 75%;
    margin-bottom: 0;
  }
  .comment-box .author {
    margin-top: 0;
  }
  .comment {
    margin-top: 0;
    margin-bottom: .5em;
  }

  #cover-photo {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    background: no-repeat center / 100%;
  }
</style>

<Page ptr onPtrRefresh={onRefresh}>
  <Navbar backLink="Back">
    <NavTitle>{event.title}</NavTitle>
    <NavRight>
      <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
    </NavRight>
  </Navbar>
  {#if event.loading}
    <Block>
      Loading...
    </Block>
  {:else}
    <Block class="no-margin"
      style="background-color: var(--f7-navbar-bg-color, var(--f7-bars-bg-color)); padding: 10px">
      <Segmented>
        <Button small fill id="eventButton" on:click={changeView('event')}>Event</Button>
        <Button small id="galleryButton" on:click={changeView('gallery')}>Gallery</Button>
        <Button small id="attendanceButton" on:click={changeView('attendance')}>Attendance</Button>
      </Segmented>
    </Block>
    {#if currentButton === 'event'}
      <List style="margin-top: 0">
        {#if event.coverPhoto}
          <li>
            <div id="cover-photo"
              style="background-image: url(https://api.oi.parkovski.com/uploads/{event.coverPhoto})">
            </div>
          </li>
        {/if}
        <ListItem>{event.description}</ListItem>
        <ListItem groupTitle>Attending?</ListItem>
        <ListItem>
          {#if event.kind === 3}
            <span style="color: var(--f7-color-blue)">You are hosting this event.</span>
          {:else}
            <div class="grid grid-cols-3 grid-gap" style="width: 100%">
              <Button small color="red" on:click={setAttendance(-1)}
                fill={event.kind === -1}>No</Button>
              <Button small color="yellow" on:click={setAttendance(1)}
                fill={event.kind === 1}>Maybe</Button>
              <Button small color="green" on:click={setAttendance(2)}
                fill={event.kind === 2}>Yes</Button>
            </div>
          {/if}
        </ListItem>
        <ListItem groupTitle>Location</ListItem>
        <ListItem>{event.place}</ListItem>
        <ListItem groupTitle>Date and Time</ListItem>
        <ListItem>
          {formatDate(event.startTime)} {formatTimeRange(event.startTime, event.endTime)}
        </ListItem>
        <ListItem groupTitle>Comments</ListItem>
        <div class="editor-section">
          <TextEditor
            bind:this={textEditor}
            placeholder="Say something..."
            mode=""
            resizable
            style="flex: 1 1 auto; margin: 0"
          />
          <Button class="comments-send-button" onClick={postComment}>
            Send
          </Button>
        </div>
        {#if event.comments}
          <div class="comments-section">
            {#each event.comments as comment (comment.id) }
              <div class="comment-box">
                {#if comment.avatarUrl}
                  <img src={`https://api.oi.parkovski.com/uploads/${comment.avatarUrl}`}
                    alt="Profile" width="32" height="32"
                    style="border-radius: 100px; vertical-align: middle"
                  >
                {:else}
                  <Icon ios="f7:person_fill" md="material:person" style="width: 32px; height: 32px"/>
                {/if}
                <div>
                  <p class="author">
                    {comment.fromName}
                  </p>
                  <p class="comment">
                    {comment.message}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </List>
    {:else if currentButton === 'gallery'}
      <Fab position="right-bottom" on:click={uploadPhotos}>
        <Icon ios="f7:plus" md="material:add"/>
      </Fab>
      {#if photos && photos.length}
        <PhotoGallery urls={photos.map(p => `https://api.oi.parkovski.com/uploads/${p}`)} />
      {:else}
        <Block>There is nothing here.</Block>
      {/if}
    {:else if currentButton === 'attendance'}
      <List style="margin-top: 0">
        <ListItem groupTitle>Hosts</ListItem>
        {#each attendance.hosts as user (user.id)}
          <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
        {/each}
        {#if attendance.attending.length}
          <ListItem groupTitle>Attending</ListItem>
          {#each attendance.attending as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
        {#if attendance.maybeAttending.length}
          <ListItem groupTitle>Maybe Attending</ListItem>
          {#each attendance.maybeAttending as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
        {#if attendance.invited.length}
          <ListItem groupTitle>Invited</ListItem>
          {#each attendance.invited as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
        {#if attendance.notAttending.length}
          <ListItem groupTitle>Not Attending</ListItem>
          {#each attendance.notAttending as user (user.id)}
            <ListItem href={`/contacts/view/${user.id}/`}>{user.name}</ListItem>
          {/each}
        {/if}
      </List>
    {/if}
  {/if}
</Page>
