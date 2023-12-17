const data = {
  users: [
    {
      id: '0',
      name: 'Alice',
      username: 'alice',
    },
    {
      id: '1',
      name: 'Bob',
      username: 'bob',
    },
    {
      id: '2',
      name: 'Charlie',
      username: 'charlie',
    },
    {
      id: '3',
      name: 'Dave',
      username: 'dave',
    },
    {
      id: '4',
      name: 'Dalia',
      username: 'dalia',
    },
    {
      id: '5',
      name: 'Ellie',
      username: 'ellie',
    },
    {
      id: '6',
      name: 'Ed',
      username: 'ed',
    },
    {
      id: '7',
      name: 'Fred',
      username: 'fred',
    },
    {
      id: '8',
      name: 'Faye',
      username: 'faye',
    },
    {
      id: '9',
      name: 'George',
      username: 'george',
    },
    {
      id: '10',
      name: 'Hayden',
      username: 'hayden',
    },
    {
      id: '11',
      name: 'Ian',
      username: 'ian',
    },
    {
      id: '12',
      name: 'Jose',
      username: 'jose',
    },
    {
      id: '13',
      name: 'Josipa',
      username: 'josipa',
    },
    {
      id: '14',
      name: 'Kate',
      username: 'kate',
    },
    {
      id: '15',
      name: 'Leo',
      username: 'leo',
    },
    {
      id: '16',
      name: 'Mike',
      username: 'mike',
    },
    {
      id: '17',
      name: 'Mary',
      username: 'mary',
    },
  ],

  groups: [
    {
      id: '0',
      name: 'Hiking',
      invited: ['2', '3'],
      members: ['0', '1', '8', '12'],
    },
    {
      id: '1',
      name: 'Board Games',
      invited: [],
      members: ['1', '3', '8', '13'],
    },
    {
      id: '2',
      name: 'Movies',
      invited: [],
      members: ['1', '5', '6', '7', '9', '10', '11', '12', '13', '17'],
    },
  ],

  events: [
    {
      id: '0',
      name: 'Weekly Hikes',
      groups: ['0'],
      invited: ['0', '1', '2', '8'],
      attending: ['3', '4', '6'],
      maybeAttending: ['7'],
      notAttending: ['11'],
    },
  ],

  threads: [
    {
      id: '0',
      from: {
        userId: '0',
      },
    },
    {
      id: '1',
      from: {
        userId: '3',
      },
    },
    {
      id: '2',
      from: {
        groupId: '0',
      },
    },
    {
      id: '3',
      from: {
        eventId: '0',
      },
    },
  ],
};

data.groups.forEach(group => {
  for (let i = 0; i < group.members.length; ++i) {
    group.members[i] = {
      id: group.members[i],
      name: data.users[+group.members[i]].name,
    };
  }
});

data.events.forEach(event => {
  for (let i = 0; i < event.groups.length; ++i) {
    event.groups[i] = {
      id: event.groups[i],
      name: data.groups[+event.groups[i]].name,
    };
  }

  [event.invited, event.attending, event.maybeAttending, event.notAttending]
    .forEach(arr => {
      for (let i = 0; i < arr.length; ++i) {
        arr[i] = {
          id: arr[i],
          name: data.users[+arr[i]],
        };
      }
    });
});

data.threads.forEach(thread => {
  if (thread.from.userId) {
    thread.from.name = data.users[+thread.from.userId].name;
  } else if (thread.from.groupId) {
    thread.from.name = data.groups[+thread.from.groupId].name;
  } else if (thread.from.eventId) {
    thread.from.name = data.events[+thread.from.eventId].name;
  }
});

export async function getUsers() {
  return data.users;
}

export async function getUser(id) {
  return data.users[+id];
}

export async function getGroups() {
  return data.groups;
}

export async function getGroup(id) {
  return data.groups[+id];
}

export async function getEvents() {
  return data.events;
}

export async function getEvent(id) {
  return data.events[+id];
}

export async function getThreads() {
  return data.threads;
}

export async function getThread(id) {
  return data.threads[+id];
}

export default data;
