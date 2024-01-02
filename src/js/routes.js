import HomePage from '../pages/home/home.svelte';
import HomePanelPage from '../pages/home/homepanel.svelte';
import ProfilePage from '../pages/home/profile.svelte';
import AboutPage from '../pages/home/about.svelte';
import QRCodePage from '../pages/home/scanqrcode.svelte';
import SettingsPage from '../pages/home/settings.svelte';
import GroupPanelPage from '../pages/groups/grouppanel.svelte';
import GroupsPage from '../pages/groups/groups.svelte';
import ViewGroupPage from '../pages/groups/viewgroup.svelte';
import NewGroupPage from '../pages/groups/newgroup.svelte';
import GroupInvitePage from '../pages/groups/viewinvite.svelte';
import GroupRequestsPage from '../pages/groups/viewrequests.svelte';
import GroupInviteUsersPage from '../pages/groups/inviteusers.svelte';
import EventPanelPage from '../pages/events/eventpanel.svelte';
import EventsPage from '../pages/events/events.svelte';
import NewEventPage from '../pages/events/newevent.svelte';
import ViewEventPage from '../pages/events/viewevent.svelte';
import EventInviteUsersPage from '../pages/events/inviteusers.svelte';
import ContactsPage from '../pages/contacts/contacts.svelte';
import ViewContactPage from '../pages/contacts/viewcontact.svelte';
import MessagesPage from '../pages/messages/messages.svelte';
import ViewMessagePage from '../pages/messages/viewmessage.svelte';
import NewMessagePage from '../pages/messages/newmessage.svelte';
import NotFoundPage from '../pages/404.svelte';

var routes = [
  {
    path: '/',
    component: HomePage,
  },
  {
    path: '/panels/home/',
    component: HomePanelPage,
  },
  {
    path: '/profile/',
    component: ProfilePage,
  },
  {
    path: '/about/',
    component: AboutPage,
  },
  {
    path: '/qrcode/',
    component: QRCodePage,
  },
  {
    path: '/settings/',
    component: SettingsPage,
  },
  {
    path: '/panels/group/:id/',
    component: GroupPanelPage,
  },
  {
    path: '/groups/',
    component: GroupsPage,
  },
  {
    path: '/groups/view/:id/',
    component: ViewGroupPage,
  },
  {
    path: '/groups/new/',
    component: NewGroupPage,
  },
  {
    path: '/groups/viewinvite/:id/',
    component: GroupInvitePage,
  },
  {
    path: '/groups/requests/:id/',
    component: GroupRequestsPage,
  },
  {
    path: '/groups/invite/:id/',
    component: GroupInviteUsersPage,
  },
  {
    path: '/panels/event/:id/',
    component: EventPanelPage,
  },
  {
    path: '/events/',
    component: EventsPage,
  },
  {
    path: '/events/new/',
    component: NewEventPage,
  },
  {
    path: '/events/view/:id/',
    component: ViewEventPage,
  },
  {
    path: '/events/invite/:id/',
    component: EventInviteUsersPage,
  },
  {
    path: '/contacts/',
    component: ContactsPage,
  },
  {
    path: '/contacts/view/:id/',
    component: ViewContactPage,
  },
  {
    path: '/messages/',
    component: MessagesPage,
  },
  {
    path: '/messages/view/:id/',
    component: ViewMessagePage,
  },
  {
    path: '/messages/new/',
    component: NewMessagePage,
  },
  {
    path: '(.*)',
    component: NotFoundPage,
  },
];

export default routes;
