import HomePage from '../pages/home.svelte';
import AboutPage from '../pages/about.svelte';
import GroupsPage from '../pages/groups.svelte';
import GroupPage from '../pages/group.svelte';
import NewGroupPage from '../pages/newgroup.svelte';
import GroupInvitePage from '../pages/groupinvite.svelte';
import EventsPage from '../pages/events.svelte';
import NewEventPage from '../pages/newevent.svelte';
import ContactsPage from '../pages/contacts.svelte';
import ContactPage from '../pages/contact.svelte';
import ProfilePage from '../pages/profile.svelte';
import MessagesPage from '../pages/messages.svelte';
import MessagePage from '../pages/message.svelte';
import NewMessagePage from '../pages/newmessage.svelte';
import SettingsPage from '../pages/settings.svelte';
import NotFoundPage from '../pages/404.svelte';

var routes = [
  {
    path: '/',
    component: HomePage,
  },
  {
    path: '/about/',
    component: AboutPage,
  },
  {
    path: '/groups/',
    component: GroupsPage,
  },
  {
    path: '/groups/view/:id/',
    component: GroupPage,
  },
  {
    path: '/groups/viewinvite/:id/',
    component: GroupInvitePage,
  },
  {
    path: '/groups/new/',
    component: NewGroupPage,
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
    path: '/contacts/',
    component: ContactsPage,
  },
  {
    path: '/contacts/view/:id/',
    component: ContactPage,
  },
  {
    path: '/profile/',
    component: ProfilePage,
  },
  {
    path: '/messages/',
    component: MessagesPage,
  },
  {
    path: '/messages/new/',
    component: NewMessagePage,
  },
  {
    path: '/messages/view/:id/',
    component: MessagePage,
  },
  {
    path: '/settings/',
    component: SettingsPage,
  },
  {
    path: '(.*)',
    component: NotFoundPage,
  },
];

export default routes;
