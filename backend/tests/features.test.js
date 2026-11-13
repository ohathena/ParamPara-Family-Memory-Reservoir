const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest-only-123456';
const app = require('../src/app');

let mongod;
beforeAll(async () => {
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI);
    await mongoose.connection.dropDatabase();
    await mongoose.connection.syncIndexes(); // dropping the database also dropped the indexes (unique email, TTL...)
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const as = (token) => ({ Authorization: `Bearer ${token}` });
const register = async (name) => (await request(app).post('/api/auth/register').send({ name, email: `${name}@test.com`, password: 'password123' })).body.token;
const api = (method, path, token, body) => {
  let r = request(app)[method](path);
  if (token) r = r.set(as(token));
  return body ? r.send(body) : r;
};

describe('account', () => {
  test('update name and change password', async () => {
    const t = await register('acc');
    expect((await api('patch', '/api/auth/me', t, { name: 'New Name' })).body.user.name).toBe('New Name');
    expect((await api('patch', '/api/auth/me', t, { name: '' })).status).toBe(400);

    const bad = await api('post', '/api/auth/change-password', t, { currentPassword: 'wrongwrong', newPassword: 'newpassword1' });
    expect(bad.status).toBe(400);
    const short = await api('post', '/api/auth/change-password', t, { currentPassword: 'password123', newPassword: 'short' });
    expect(short.status).toBe(400);
    const ok = await api('post', '/api/auth/change-password', t, { currentPassword: 'password123', newPassword: 'newpassword1' });
    expect(ok.status).toBe(200);

    expect((await request(app).post('/api/auth/login').send({ email: 'acc@test.com', password: 'password123' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'acc@test.com', password: 'newpassword1' })).status).toBe(200);
  });

  test('password longer than 72 characters is refused', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'x', email: 'long@test.com', password: 'a'.repeat(73) });
    expect(res.status).toBe(400);
  });
});

describe('invitations', () => {
  let owner, guest, stranger, familyId, token;
  beforeAll(async () => {
    owner = await register('inv_owner');
    guest = await register('inv_guest');
    stranger = await register('inv_stranger');
    familyId = (await api('post', '/api/families', owner, { name: 'Invite Family' })).body.family._id;
  });

  test('only the owner can create an invitation', async () => {
    expect((await api('post', `/api/families/${familyId}/invitations`, guest)).status).toBe(403);
    const res = await api('post', `/api/families/${familyId}/invitations`, owner);
    expect(res.status).toBe(201);
    expect(res.body.token).toHaveLength(48);
    token = res.body.token;
  });

  test('token is not stored in plain text', async () => {
    const stored = await mongoose.connection.collection('invitations').findOne({});
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  test('preview, accept, then the link is used up', async () => {
    const preview = await api('get', `/api/invitations/${token}`, guest);
    expect(preview.body.family.name).toBe('Invite Family');

    const accept = await api('post', `/api/invitations/${token}/accept`, guest);
    expect(accept.status).toBe(200);
    expect(accept.body.alreadyMember).toBe(false);
    expect((await api('get', `/api/families/${familyId}`, guest)).status).toBe(200);

    expect((await api('post', `/api/invitations/${token}/accept`, stranger)).status).toBe(410);
    expect((await api('get', `/api/invitations/${token}`, stranger)).status).toBe(410);
  });

  test('wrong token is a 404', async () => {
    expect((await api('get', `/api/invitations/${'0'.repeat(48)}`, guest)).status).toBe(404);
  });

  test('already a member keeps the link unused', async () => {
    const t2 = (await api('post', `/api/families/${familyId}/invitations`, owner)).body.token;
    const res = await api('post', `/api/invitations/${t2}/accept`, guest);
    expect(res.body.alreadyMember).toBe(true);
    expect((await api('post', `/api/invitations/${t2}/accept`, stranger)).status).toBe(200);
  });

  test('collaborator can leave, owner cannot', async () => {
    expect((await api('delete', `/api/families/${familyId}/leave`, guest)).status).toBe(200);
    expect((await api('get', `/api/families/${familyId}`, guest)).status).toBe(403);
    expect((await api('delete', `/api/families/${familyId}/leave`, owner)).status).toBe(400);
  });
});

describe('tree, relationships list, timeline, stats', () => {
  let owner, outsider, familyId, grandma, dad, kid, mum;
  beforeAll(async () => {
    owner = await register('tree_owner');
    outsider = await register('tree_outsider');
    familyId = (await api('post', '/api/families', owner, { name: 'Tree Family' })).body.family._id;
    const add = async (name) => (await api('post', `/api/families/${familyId}/members`, owner, { name })).body.member._id;
    grandma = await add('Grandma');
    dad = await add('Dad');
    mum = await add('Mum');
    kid = await add('Kid');
    const rel = (source, target, type) => api('post', '/api/relationships', owner, { source, target, type });
    await rel(grandma, dad, 'parent');
    await rel(dad, kid, 'parent');
    await rel(kid, mum, 'child'); // kid is the child of mum
    await rel(dad, mum, 'spouse');
  });

  test('tree puts people into the right generations', async () => {
    const res = await api('get', `/api/families/${familyId}/tree`, owner);
    expect(res.status).toBe(200);
    const names = res.body.tree.generations.map((g) => g.members.map((m) => m.name));
    expect(names).toEqual([['Grandma'], ['Dad', 'Mum'], ['Kid']]);
    expect(res.body.tree.hasCycle).toBe(false);
  });

  test('a loop in the data does not hang the server', async () => {
    const f = (await api('post', '/api/families', owner, { name: 'Loop' })).body.family._id;
    const a = (await api('post', `/api/families/${f}/members`, owner, { name: 'A' })).body.member._id;
    const b = (await api('post', `/api/families/${f}/members`, owner, { name: 'B' })).body.member._id;
    const c = (await api('post', `/api/families/${f}/members`, owner, { name: 'C' })).body.member._id;
    // a direct reverse loop is refused since v2, a longer one (A > B > C > A) can still be entered
    await api('post', '/api/relationships', owner, { source: a, target: b, type: 'parent' });
    expect((await api('post', '/api/relationships', owner, { source: b, target: a, type: 'parent' })).status).toBe(409);
    await api('post', '/api/relationships', owner, { source: b, target: c, type: 'parent' });
    await api('post', '/api/relationships', owner, { source: c, target: a, type: 'parent' });
    const res = await api('get', `/api/families/${f}/tree`, owner);
    expect(res.status).toBe(200);
    expect(res.body.tree.hasCycle).toBe(true);
  });

  test('family-wide relationships list', async () => {
    const res = await api('get', `/api/families/${familyId}/relationships`, owner);
    expect(res.body.count).toBe(4);
    expect(res.body.relationships[0].source.name).toBeDefined();
  });

  test('outsiders cannot use the read-only views', async () => {
    for (const path of ['tree', 'relationships', 'stats', 'timeline']) {
      expect((await api('get', `/api/families/${familyId}/${path}`, outsider)).status).toBe(403);
    }
  });

  test('timeline groups by year and stats count', async () => {
    const mem = (title, eventDate, category, extra = {}) =>
      api('post', '/api/memories', owner, { family: familyId, title, content: 'x'.repeat(300), category, eventDate, ...extra });
    await mem('Old wedding', '1990-05-01', 'Family event', { people: [dad, mum] });
    await mem('First house', '1990-09-10', 'Achievement');
    await mem('Kid born', '2003-06-15', 'Family event', { people: [kid] });
    await mem('No date', null, 'Story');

    const tl = await api('get', `/api/families/${familyId}/timeline`, owner);
    expect(tl.body.count).toBe(3);
    expect(tl.body.years.map((y) => y.year)).toEqual([1990, 2003]);
    expect(tl.body.years[0].memories[0].excerpt.length).toBeLessThan(200);

    const range = await api('get', `/api/families/${familyId}/timeline?from=2000-01-01`, owner);
    expect(range.body.count).toBe(1);
    expect((await api('get', `/api/families/${familyId}/timeline?from=garbage`, owner)).status).toBe(400);

    const stats = await api('get', `/api/families/${familyId}/stats`, owner);
    expect(stats.body.stats).toMatchObject({ members: 4, memories: 4, relationships: 4 });
    expect(stats.body.stats.byCategory['Family event']).toBe(2);
  });

  test('filter memories by person, and clear a date with null', async () => {
    const list = await api('get', `/api/memories?family=${familyId}&person=${kid}`, owner);
    expect(list.body.total).toBe(1);
    const id = list.body.memories[0]._id;
    const upd = await api('patch', `/api/memories/${id}`, owner, { eventDate: null });
    expect(upd.status).toBe(200);
    expect(upd.body.memory.eventDate).toBeNull();
  });

  test('media link must be http(s), unknown fields are ignored', async () => {
    const bad = await api('post', '/api/memories', owner, { family: familyId, title: 't', content: 'c', mediaUrl: 'javascript:alert(1)' });
    expect(bad.status).toBe(400);
    const ok = await api('post', '/api/memories', owner, { family: familyId, title: 't', content: 'c', author: new mongoose.Types.ObjectId(), isAdmin: true });
    expect(ok.status).toBe(201);
    expect(ok.body.memory.isAdmin).toBeUndefined();
    const me = await api('get', '/api/auth/me', owner);
    expect(ok.body.memory.author).toBe(me.body.user.id); // cannot fake the author
  });
});

describe('platform', () => {
  test('health checks and request id', async () => {
    const live = await request(app).get('/api/health');
    expect(live.status).toBe(200);
    expect(live.headers['x-request-id']).toBeDefined();
    expect((await request(app).get('/api/health/ready')).status).toBe(200);
  });

  test('responses never contain password hashes', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'tree_owner@test.com', password: 'password123' });
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });
});
