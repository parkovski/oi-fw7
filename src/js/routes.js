import HomePage from '../pages/home.svelte';
import AboutPage from '../pages/about.svelte';
import GroupsPage from '../pages/groups.svelte';
import GroupPage from '../pages/group.svelte';
import EventsPage from '../pages/events.svelte';
import ContactsPage from '../pages/contacts.svelte';
import ContactPage from '../pages/contact.svelte';
import ProfilePage from '../pages/profile.svelte';
import MessagesPage from '../pages/messages.svelte';
import MessagePage from '../pages/message.svelte';
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
    path: '/groups/:id/',
    component: GroupPage,
  },
  {
    path: '/events/',
    component: EventsPage,
  },
  {
    path: '/contacts/',
    component: ContactsPage,
  },
  {
    path: '/contacts/:id/',
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
    path: '/messages/:id/',
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
