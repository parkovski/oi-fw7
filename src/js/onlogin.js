const loginListeners = [];
const logoutListeners = [];
let didLogin = false;

export function onLogin(listener) {
  loginListeners.push(listener);
  if (didLogin) {
    listener();
  }
}

export function onLogout(listener) {
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
