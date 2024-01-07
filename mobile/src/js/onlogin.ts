type Listener = () => void;

const loginListeners: Listener[] = [];
const logoutListeners: Listener[] = [];
let didLogin = false;

export function onLogin(listener: Listener) {
  loginListeners.push(listener);
  if (didLogin) {
    listener();
  }
}

export function onLogout(listener: Listener) {
  logoutListeners.push(listener);
}

export function postLoginEvent() {
  didLogin = true;
  loginListeners.forEach(l => l());
}

export function postLogoutEvent() {
  didLogin = false;
  logoutListeners.forEach(l => l());
}
