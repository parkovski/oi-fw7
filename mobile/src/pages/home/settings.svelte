<script>
  import {
    Page,
    Navbar,
    List,
    ListItem,
    Toggle,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import settingsService from '../../services/settings';

  let notificationChanging = false;
  let allNotifications;
  let newEventInvite;
  let eventRespondedTo;
  let eventCommentedOn;
  let eventAttendanceChanged;
  let messageReceived;
  let groupMessageReceived;
  let newFollower;
  let newFollowRequest;
  let followRequestApproved;

  function getAllNotificationToggles() {
    return [
      newEventInvite,
      eventRespondedTo,
      eventCommentedOn,
      eventAttendanceChanged,
      messageReceived,
      groupMessageReceived,
      newFollowRequest,
      newFollower,
      followRequestApproved,
    ];
  }

  function toggleNotification(event) {
    return function(instance) {
      if (notificationChanging) return;
      notificationChanging = true;
      settingsService.setNotificationSetting(event, instance.checked);
      allNotifications.instance().checked =
        getAllNotificationToggles().every(item => item.instance().checked);
      notificationChanging = false;
    };
  }

  function toggleAllNotifications(instance) {
    if (notificationChanging) return;
    notificationChanging = true;
    settingsService.setAllNotificationSettings(instance.checked);
    getAllNotificationToggles().forEach(item => item.instance().checked = instance.checked);
    notificationChanging = false;
  }

  onMount(() => {
    settingsService.getNotificationSettings().then(settings => {
      allNotifications.instance().checked = Object.keys(settings).every(key => settings[key]);

      newEventInvite.instance().checked = settings.event_added;
      eventRespondedTo.instance().checked = settings.event_responded;
      eventCommentedOn.instance().checked = settings.event_commented;
      eventAttendanceChanged.instance().checked = settings.event_attendance_changed;
      messageReceived.instance().checked = settings.chat;
      groupMessageReceived.instance().checked = settings.groupchat;
      newFollowRequest.instance().checked = settings.contact_requested;
      newFollower.instance().checked = settings.contact_added;
      followRequestApproved.instance().checked = settings.contact_request_approved;

      allNotifications.instance().on('change', inst => toggleAllNotifications(inst));

      newEventInvite.instance().on('change', toggleNotification('event_added'));
      eventRespondedTo.instance().on('change', toggleNotification('event_responded'));
      eventCommentedOn.instance().on('change', toggleNotification('event_commented'));
      eventAttendanceChanged.instance().on('change', toggleNotification('event_attendance_changed'));
      messageReceived.instance().on('change', toggleNotification('chat'));
      groupMessageReceived.instance().on('change', toggleNotification('groupchat'));
      newFollowRequest.instance().on('change', toggleNotification('contact_requested'));
      newFollower.instance().on('change', toggleNotification('contact_added'));
      followRequestApproved.instance().on('change', toggleNotification('contact_request_approved'));
    });
  });
</script>

<Page name="settings">
  <Navbar title="Settings" backLink="Back"/>

  <List strongIos style="margin-top: 0">
    <ListItem groupTitle>Notifications</ListItem>
    <ListItem>
      <span>All notifications</span>
      <Toggle checked bind:this={allNotifications} />
    </ListItem>
    <ListItem groupTitle>Events</ListItem>
    <ListItem>
      <span>New event invite</span>
      <Toggle checked bind:this={newEventInvite} />
    </ListItem>
    <ListItem>
      <span>Event I'm hosting responded to</span>
      <Toggle checked bind:this={eventRespondedTo} />
    </ListItem>
    <ListItem>
      <span>Event commented on</span>
      <Toggle checked bind:this={eventCommentedOn} />
    </ListItem>
    <ListItem>
      <span>Invited to host</span>
      <Toggle checked bind:this={eventAttendanceChanged} />
    </ListItem>
    <ListItem groupTitle>Messages</ListItem>
    <ListItem>
      <span>Message received</span>
      <Toggle checked bind:this={messageReceived} />
    </ListItem>
    <ListItem>
      <span>Group message received</span>
      <Toggle checked bind:this={groupMessageReceived} />
    </ListItem>
    <ListItem groupTitle>Followers</ListItem>
    <ListItem>
      <span>New follower</span>
      <Toggle checked bind:this={newFollower} />
    </ListItem>
    <ListItem>
      <span>New follow request</span>
      <Toggle checked bind:this={newFollowRequest} />
    </ListItem>
    <ListItem>
      <span>Follow request approved</span>
      <Toggle checked bind:this={followRequestApproved} />
    </ListItem>
  </List>
</Page>
