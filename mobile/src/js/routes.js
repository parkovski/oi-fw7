import BlankPage from '../pages/blank.svelte';
import HomePage from '../pages/home/home.svelte';
import HomePanelPage from '../pages/home/homepanel.svelte';
import LoginPage from '../pages/account/login.svelte';
import GroupPanelPage from '../pages/groups/grouppanel.svelte';
import GroupsPage from '../pages/groups/groups.svelte';
import EventPanelPage from '../pages/events/eventpanel.svelte';
import EventsPage from '../pages/events/events.svelte';
import ContactsPage from '../pages/contacts/contacts.svelte';
import MessagesPage from '../pages/messages/messages.svelte';
import NotFoundPage from '../pages/404.svelte';

var routes = [
  {
    path: '/blank/',
    component: BlankPage
  },
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
    asyncComponent: () => import('../pages/home/profile.svelte'),
  },
  {
    path: '/about/',
    asyncComponent: () => import('../pages/home/about.svelte'),
  },
  {
    path: '/qrcode/',
    asyncComponent: () => import('../pages/home/scanqrcode.svelte'),
  },
  {
    path: '/account/login/',
    component: LoginPage,
  },
  {
    path: '/account/register/',
    asyncComponent: () => import('../pages/account/register.svelte'),
  },
  {
    path: '/settings/',
    asyncComponent: () => import('../pages/settings/settings.svelte'),
  },
  {
    path: '/settings/account/',
    asyncComponent: () => import('../pages/settings/account.svelte'),
  },
  {
    path: '/settings/password/',
    asyncComponent: () => import('../pages/settings/password.svelte'),
  },
  {
    path: '/settings/link-account/',
    asyncComponent: () => import('../pages/settings/link-account.svelte'),
  },
  {
    path: '/settings/link-account/microsoft/',
    asyncComponent: () => import('../pages/settings/account-microsoft.svelte'),
  },
  {
    path: '/settings/link-account/google/',
    asyncComponent: () => import('../pages/settings/account-google.svelte'),
  },
  {
    path: '/settings/link-account/apple/',
    asyncComponent: () => import('../pages/settings/account-apple.svelte'),
  },
  {
    path: '/settings/notifications/',
    asyncComponent: () => import('../pages/settings/notifications.svelte'),
  },
  {
    path: '/developer/',
    asyncComponent: () => import('../pages/home/developer.svelte'),
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
    asyncComponent: () => import('../pages/groups/viewgroup.svelte'),
  },
  {
    path: '/groups/new/',
    asyncComponent: () => import('../pages/groups/newgroup.svelte'),
  },
  {
    path: '/groups/viewinvite/:id/',
    asyncComponent: () => import('../pages/groups/viewinvite.svelte'),
  },
  {
    path: '/groups/requests/:id/',
    asyncComponent: () => import('../pages/groups/viewrequests.svelte'),
  },
  {
    path: '/groups/invite/:id/',
    asyncComponent: () => import('../pages/groups/inviteusers.svelte'),
  },
  {
    path: '/groups/newevent/:id/',
    asyncComponent: () => import('../pages/groups/newevent.svelte'),
  },
  {
    path: '/groups/viewevent/:id/',
    asyncComponent: () => import('../pages/groups/viewevent.svelte'),
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
    asyncComponent: () => import('../pages/events/newevent.svelte'),
  },
  {
    path: '/events/view/:id/',
    asyncComponent: () => import('../pages/events/viewevent.svelte'),
  },
  {
    path: '/events/invite/:id/',
    asyncComponent: () => import('../pages/events/inviteusers.svelte'),
  },
  {
    path: '/events/addhosts/:id/',
    asyncComponent: () => import('../pages/events/addhosts.svelte'),
  },
  {
    path: '/contacts/',
    component: ContactsPage,
  },
  {
    path: '/contacts/view/:id/',
    asyncComponent: () => import('../pages/contacts/viewcontact.svelte'),
  },
  {
    path: '/messages/',
    component: MessagesPage,
  },
  {
    path: '/messages/view/:id/',
    asyncComponent: () => import('../pages/messages/viewmessage.svelte'),
  },
  {
    path: '/messages/new/',
    asyncComponent: () => import('../pages/messages/newmessage.svelte'),
  },
  {
    path: '(.*)',
    component: NotFoundPage,
  },
];

export default routes;
