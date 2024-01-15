import HomePage from '../pages/home/home.svelte';

var routes = [
  {
    path: '/',
    component: HomePage,
  },
  {
    path: '/panels/home/',
    asyncComponent: () => import('../pages/home/homepanel.svelte'),
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
    path: '/settings/',
    asyncComponent: () => import('../pages/home/settings.svelte'),
  },
  {
    path: '/developer/',
    asyncComponent: () => import('../pages/home/developer.svelte'),
  },
  {
    path: '/panels/group/:id/',
    asyncComponent: () => import('../pages/groups/grouppanel.svelte'),
  },
  {
    path: '/groups/',
    asyncComponent: () => import('../pages/groups/groups.svelte'),
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
    asyncComponent: () => import('../pages/events/eventpanel.svelte'),
  },
  {
    path: '/events/',
    asyncComponent: () => import('../pages/events/events.svelte'),
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
    asyncComponent: () => import('../pages/contacts/contacts.svelte'),
  },
  {
    path: '/contacts/view/:id/',
    asyncComponent: () => import('../pages/contacts/viewcontact.svelte'),
  },
  {
    path: '/messages/',
    asyncComponent: () => import('../pages/messages/messages.svelte'),
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
    asyncComponent: () => import('../pages/404.svelte'),
  },
];

export default routes;
