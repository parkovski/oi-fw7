import { createStore } from 'framework7/lite';

const store = createStore({
  state: {
    groups: [],
    contacts: [],
    messages: [],
  },

  getters: {
    groups({ state }) {
      return state.groups;
    },
    contacts({ state }) {
      return state.contacts;
    },
    messages({ state }) {
      return state.messages;
    }
  },

  actions: {
    setGroups({ state }, groups) {
      state.groups = groups;
    },
    addGroup({ state }, group) {
      state.groups = [...state.groups, group];
    },
    removeGroup({ state }, group) {
      const id = typeof group === 'string' ? group : group.id;
      state.groups = state.groups.filter(g => g.id !== id);
    },

    setContacts({ state }, contacts) {
      state.contacts = contacts;
    },
    addContact({ state }, contact) {
      state.contacts = [...state.contacts, contact];
    },
    removeContact({ state }, contact) {
      const id = typeof contact === 'string' ? contact : contact.id;
      state.contacts = state.contacts.filter(c => c.id !== id);
    },

    setMessages({ state }, messages) {
      state.messages = messages;
    },
  },
})
export default store;
