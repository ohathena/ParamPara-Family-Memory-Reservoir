const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest-only-123456';
const app = require('../src/app');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Comment = require('../src/models/Comment');
const Memory = require('../src/models/Memory');
const Family = require('../src/models/Family');

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

const register = async (name) => (await request(app).post('/api/auth/register').send({ name, email: `${name}@v2.com`, password: 'password123' })).body.token;
const api = (method, path, token, body) => {
  let r = request(app)[method](path);
  if (token) r = r.set({ Authorization: `Bearer ${token}` });
  return body ? r.send(body) : r;
};
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// owner creates a family, and invites `name` with a role
async function joinWithRole(ownerToken, familyId, name, role) {
  const token = await register(name);
  const invite = await api('post', `/api/families/${familyId}/invitations`, ownerToken, { role });
  expect(invite.body.role).toBe(role);
  const accept = await api('post', `/api/invitations/${invite.body.token}/accept`, token);
  expect(accept.body.role).toBe(role);
  return token;
}

describe('sessions', () => {
  test('changing the password ends old sessions but keeps this one', async () => {
    const t1 = await register('sess');
    const res = await api('post', '/api/auth/change-password', t1, { currentPassword: 'password123', newPassword: 'newpassword1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect((await api('get', '/api/auth/me', t1)).status).toBe(401); // old token is dead
    expect((await api('get', '/api/auth/me', res.body.token)).status).toBe(200);
  });

  test('log out everywhere', async () => {
    await register('everywhere');
    const login = async () => (await request(app).post('/api/auth/login').send({ email: 'everywhere@v2.com', password: 'password123' })).body.token;
    const phone = await login();
    const laptop = await login();
    const res = await api('post', '/api/auth/logout-all', laptop);
    expect((await api('get', '/api/auth/me', phone)).status).toBe(401);
    expect((await api('get', '/api/auth/me', laptop)).status).toBe(401);
    expect((await api('get', '/api/auth/me', res.body.token)).status).toBe(200);
  });
});

describe('password reset', () => {
  test('forgot-password answers the same for known and unknown emails', async () => {
    await register('forgot');
    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'forgot@v2.com' });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@v2.com' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    const user = await User.findOne({ email: 'forgot@v2.com' }).select('+resetTokenHash +resetTokenExpires');
    expect(user.resetTokenHash).toMatch(/^[0-9a-f]{64}$/); // only a hash is stored
    expect(user.resetTokenExpires > new Date()).toBe(true);
  });

  test('reset with a valid link, once only; old sessions end', async () => {
    const old = await register('reset');
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ email: 'reset@v2.com' }, { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + 60000) });

    const res = await request(app).post('/api/auth/reset-password').send({ token, password: 'brandnew123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'again12345' })).status).toBe(400);
    expect((await api('get', '/api/auth/me', old)).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'reset@v2.com', password: 'brandnew123' })).status).toBe(200);
  });

  test('expired and malformed links are refused', async () => {
    await register('expired');
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ email: 'expired@v2.com' }, { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() - 1000) });
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'brandnew123' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'brandnew123' })).status).toBe(400);
  });
});

describe('roles', () => {
  let owner, familyId, viewer, editor, memberId;
  beforeAll(async () => {
    owner = await register('roleowner');
    familyId = (await api('post', '/api/families', owner, { name: 'Role Family' })).body.family._id;
    memberId = (await api('post', `/api/families/${familyId}/members`, owner, { name: 'Nani' })).body.member._id;
    viewer = await joinWithRole(owner, familyId, 'viewer1', 'viewer');
    editor = await joinWithRole(owner, familyId, 'editor1', 'editor');
  });

  test('viewer can read but not change content', async () => {
    expect((await api('get', `/api/families/${familyId}`, viewer)).body.family.role).toBe('viewer');
    expect((await api('get', `/api/families/${familyId}/members`, viewer)).status).toBe(200);
    expect((await api('get', `/api/memories?family=${familyId}`, viewer)).status).toBe(200);
    expect((await api('post', `/api/families/${familyId}/members`, viewer, { name: 'X' })).status).toBe(403);
    expect((await api('patch', `/api/members/${memberId}`, viewer, { name: 'X' })).status).toBe(403);
    expect((await api('delete', `/api/members/${memberId}`, viewer)).status).toBe(403);
    expect((await api('post', '/api/memories', viewer, { family: familyId, title: 'T', content: 'C' })).status).toBe(403);
    expect((await api('post', '/api/uploads/signature', viewer, { family: familyId })).status).toBe(403);
  });

  test('editor can add content', async () => {
    expect((await api('get', `/api/families/${familyId}`, editor)).body.family.role).toBe('editor');
    expect((await api('post', `/api/families/${familyId}/members`, editor, { name: 'Mama ji' })).status).toBe(201);
    expect((await api('post', '/api/memories', editor, { family: familyId, title: 'Holi', content: 'Colours' })).status).toBe(201);
  });

  test('owner changes roles; only owner can', async () => {
    const viewerId = (await api('get', '/api/auth/me', viewer)).body.user.id;
    expect((await api('patch', `/api/families/${familyId}/collaborators/${viewerId}`, editor, { role: 'editor' })).status).toBe(403);
    expect((await api('patch', `/api/families/${familyId}/collaborators/${viewerId}`, owner, { role: 'boss' })).status).toBe(400);
    expect((await api('patch', `/api/families/${familyId}/collaborators/${viewerId}`, owner, { role: 'editor' })).status).toBe(200);
    expect((await api('post', `/api/families/${familyId}/members`, viewer, { name: 'Now allowed' })).status).toBe(201);
    await api('patch', `/api/families/${familyId}/collaborators/${viewerId}`, owner, { role: 'viewer' });
    const fam = await Family.findById(familyId);
    expect(fam.viewers.map(String)).toContain(viewerId);
    expect(fam.collaborators.map(String)).not.toContain(viewerId);
  });

  test('add by email with a role, no duplicates, owner sees everyone', async () => {
    await register('byemail');
    expect((await api('post', `/api/families/${familyId}/collaborators`, owner, { email: 'byemail@v2.com', role: 'viewer' })).status).toBe(201);
    expect((await api('post', `/api/families/${familyId}/collaborators`, owner, { email: 'byemail@v2.com', role: 'editor' })).status).toBe(409);
    const fam = (await api('get', `/api/families/${familyId}`, owner)).body.family;
    expect(fam.owner.name).toBe('roleowner');
    expect(fam.viewers.map((u) => u.name)).toEqual(expect.arrayContaining(['viewer1', 'byemail']));
    expect(fam.collaborators.map((u) => u.name)).toContain('editor1');
  });

  test('viewer can leave', async () => {
    const t = await joinWithRole(owner, familyId, 'leaver', 'viewer');
    expect((await api('delete', `/api/families/${familyId}/leave`, t)).status).toBe(200);
    expect((await api('get', `/api/families/${familyId}`, t)).status).toBe(403);
  });
});

describe('comments', () => {
  let owner, familyId, viewer, editor, memoryId, outsider;
  beforeAll(async () => {
    owner = await register('cowner');
    outsider = await register('coutsider');
    familyId = (await api('post', '/api/families', owner, { name: 'Comment Family' })).body.family._id;
    viewer = await joinWithRole(owner, familyId, 'cviewer', 'viewer');
    editor = await joinWithRole(owner, familyId, 'ceditor', 'editor');
    memoryId = (await api('post', '/api/memories', owner, { family: familyId, title: 'Wedding', content: 'Baraat' })).body.memory._id;
  });

  test('every role can comment, count stays in sync', async () => {
    const a = await api('post', `/api/memories/${memoryId}/comments`, viewer, { content: 'I remember this!' });
    expect(a.status).toBe(201);
    expect(a.body.comment.author.name).toBe('cviewer');
    await api('post', `/api/memories/${memoryId}/comments`, editor, { content: 'Me too' });
    expect((await api('post', `/api/memories/${memoryId}/comments`, viewer, { content: '   ' })).status).toBe(400);
    expect((await api('post', `/api/memories/${memoryId}/comments`, outsider, { content: 'hi' })).status).toBe(403);
    expect((await api('get', `/api/memories/${memoryId}/comments`, outsider)).status).toBe(403);

    const list = await api('get', `/api/memories/${memoryId}/comments`, owner);
    expect(list.body.comments.map((c) => c.content)).toEqual(['I remember this!', 'Me too']); // oldest first
    expect((await Memory.findById(memoryId)).commentCount).toBe(2);
  });

  test('only the writer or owner deletes a comment', async () => {
    const c = (await api('post', `/api/memories/${memoryId}/comments`, viewer, { content: 'delete me' })).body.comment._id;
    expect((await api('delete', `/api/comments/${c}`, editor)).status).toBe(403);
    expect((await api('delete', `/api/comments/${c}`, viewer)).status).toBe(200);
    const c2 = (await api('post', `/api/memories/${memoryId}/comments`, editor, { content: 'owner removes' })).body.comment._id;
    expect((await api('delete', `/api/comments/${c2}`, owner)).status).toBe(200);
    expect((await api('delete', `/api/comments/${c2}`, owner)).status).toBe(404);
    expect((await Memory.findById(memoryId)).commentCount).toBe(2);
  });

  test('deleting a memory deletes its comments', async () => {
    const m = (await api('post', '/api/memories', owner, { family: familyId, title: 'Temp', content: 'x' })).body.memory._id;
    await api('post', `/api/memories/${m}/comments`, viewer, { content: 'bye' });
    expect((await api('delete', `/api/memories/${m}`, owner)).status).toBe(200);
    expect(await Comment.countDocuments({ memory: m })).toBe(0);
  });

  test('memory detail says what you can do', async () => {
    expect((await api('get', `/api/memories/${memoryId}`, owner)).body.canEdit).toBe(true);
    expect((await api('get', `/api/memories/${memoryId}`, editor)).body.canEdit).toBe(false); // not the author
    expect((await api('get', `/api/memories/${memoryId}`, viewer)).body.canEdit).toBe(false);
  });
});

describe('activity, stats, export, family list', () => {
  let owner, editor, familyId;
  beforeAll(async () => {
    owner = await register('aowner');
    familyId = (await api('post', '/api/families', owner, { name: 'Activity Family' })).body.family._id;
    editor = await joinWithRole(owner, familyId, 'aeditor', 'editor');
    const nana = (await api('post', `/api/families/${familyId}/members`, editor, { name: 'Nana ji', birthDate: '1940-01-01', deathDate: '2010-05-05' })).body.member._id;
    const m = (await api('post', '/api/memories', editor, { family: familyId, title: 'Old radio', content: 'Vividh Bharati', eventDate: '1975-06-01', people: [nana] })).body.memory._id;
    await api('post', `/api/memories/${m}/comments`, owner, { content: 'Classic' });
  });

  test('feed shows newest first, with names', async () => {
    const res = await api('get', `/api/families/${familyId}/activity`, owner);
    expect(res.status).toBe(200);
    expect(res.body.activity.map((a) => a.action)).toEqual(['comment.added', 'memory.created', 'member.added', 'person.joined', 'family.created']);
    expect(res.body.activity[1].actorName).toBe('aeditor');
    expect(res.body.activity[1].subjectLabel).toBe('Old radio');
    const two = await api('get', `/api/families/${familyId}/activity?limit=2`, owner);
    expect(two.body.activity).toHaveLength(2);
    expect(two.body.nextBefore).toBeTruthy();
    expect((await api('get', `/api/families/${familyId}/activity?limit=500`, owner)).status).toBe(400);
  });

  test('stats include comments and years covered', async () => {
    const s = (await api('get', `/api/families/${familyId}/stats`, owner)).body.stats;
    expect(s.comments).toBe(1);
    expect(s.yearsCovered).toEqual({ from: 1975, to: 1975 });
  });

  test('family list has role and counts', async () => {
    const list = (await api('get', '/api/families', editor)).body.families;
    const fam = list.find((f) => f._id === familyId);
    expect(fam).toMatchObject({ role: 'editor', memberCount: 1, memoryCount: 1, peopleWithAccess: 2 });
  });

  test('owner can export everything, others cannot', async () => {
    const res = await api('get', `/api/families/${familyId}/export`, owner);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="parampara-activity-family-/);
    expect(res.body.format).toBe('parampara-export');
    expect(res.body.members[0].name).toBe('Nana ji');
    expect(res.body.memories[0].author).toBe('aeditor');
    expect(res.body.comments).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toMatch(/password/);
    expect((await api('get', `/api/families/${familyId}/export`, editor)).status).toBe(403);
  });
});

describe('members and relationships v2', () => {
  let owner, familyId, a, b;
  beforeAll(async () => {
    owner = await register('mowner');
    familyId = (await api('post', '/api/families', owner, { name: 'Member Family' })).body.family._id;
    a = (await api('post', `/api/families/${familyId}/members`, owner, { name: 'A', gender: 'female', nickname: 'Dadi', birthPlace: 'Shimla', photoUrl: 'https://img.example.com/a.jpg', birthDate: '1950-01-01' })).body.member._id;
    b = (await api('post', `/api/families/${familyId}/members`, owner, { name: 'B' })).body.member._id;
  });

  test('new member fields are validated', async () => {
    const add = (body) => api('post', `/api/families/${familyId}/members`, owner, { name: 'Z', ...body });
    expect((await add({ gender: 'robot' })).status).toBe(400);
    expect((await add({ photoUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await add({ birthDate: '2000-01-01', deathDate: '1990-01-01' })).status).toBe(400);
    // only the death date sent, but it is before the saved birth date
    expect((await api('patch', `/api/members/${a}`, owner, { deathDate: '1940-01-01' })).status).toBe(400);
    expect((await api('patch', `/api/members/${a}`, owner, { deathDate: '2020-01-01' })).status).toBe(200);
  });

  test('member profile returns relationships and memory count', async () => {
    await api('post', '/api/relationships', owner, { source: a, target: b, type: 'parent' });
    await api('post', '/api/memories', owner, { family: familyId, title: 'With Dadi', content: 'x', people: [a] });
    const res = await api('get', `/api/members/${a}`, owner);
    expect(res.body.member.nickname).toBe('Dadi');
    expect(res.body.relationships).toHaveLength(1);
    expect(res.body.relationships[0].target.name).toBe('B');
    expect(res.body.memoryCount).toBe(1);
    expect(res.body.role).toBe('owner');
  });

  test('mirror duplicates and contradictions are refused', async () => {
    const make = (body) => api('post', '/api/relationships', owner, body);
    expect((await make({ source: b, target: a, type: 'child' })).status).toBe(409); // same as "A parent of B"
    expect((await make({ source: a, target: b, type: 'spouse' })).status).toBe(409); // parent and spouse at once
    expect((await make({ source: b, target: a, type: 'parent' })).status).toBe(409); // reverse parent loop
  });

  test('tree carries photo, nickname and dates', async () => {
    const tree = (await api('get', `/api/families/${familyId}/tree`, owner)).body.tree;
    const dadi = tree.generations[0].members.find((m) => m.id === a);
    expect(dadi).toMatchObject({ nickname: 'Dadi', gender: 'female', photoUrl: 'https://img.example.com/a.jpg' });
    expect(dadi.deathDate).toBeTruthy();
  });
});

describe('uploads and config', () => {
  test('public config tells the frontend what is switched on', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.features).toHaveProperty('uploads', false);
  });

  test('signature needs setup, then is a valid Cloudinary signature', async () => {
    const owner = await register('uploader');
    const familyId = (await api('post', '/api/families', owner, { name: 'Photo Family' })).body.family._id;
    expect((await api('post', '/api/uploads/signature', owner, { family: familyId })).status).toBe(503);

    Object.assign(env.cloudinary, { cloudName: 'demo', apiKey: '123', apiSecret: 'shh', enabled: true });
    try {
      const res = await api('post', '/api/uploads/signature', owner, { family: familyId });
      expect(res.status).toBe(200);
      const { signature, api_key: key, ...signed } = res.body.fields;
      expect(key).toBe('123');
      expect(signed.folder).toBe(`parampara/${familyId}`);
      const expected = crypto.createHash('sha1').update(Object.keys(signed).sort().map((k) => `${k}=${signed[k]}`).join('&') + 'shh').digest('hex');
      expect(signature).toBe(expected);
      expect(JSON.stringify(res.body)).not.toMatch(/shh/); // the secret never leaves the server
      expect((await api('post', '/api/uploads/signature', await register('stranger2'), { family: familyId })).status).toBe(403);
    } finally {
      Object.assign(env.cloudinary, { cloudName: '', apiKey: '', apiSecret: '', enabled: false });
    }
  });
});

describe('delete account', () => {
  test('needs the password; owned families go, joined families stay', async () => {
    const leaving = await register('leaving');
    const other = await register('otherowner');
    const own = (await api('post', '/api/families', leaving, { name: 'Mine' })).body.family._id;
    const joined = (await api('post', '/api/families', other, { name: 'Theirs' })).body.family._id;
    await api('post', `/api/families/${joined}/collaborators`, other, { email: 'leaving@v2.com' });
    const memory = (await api('post', '/api/memories', leaving, { family: joined, title: 'My story', content: 'stays' })).body.memory._id;
    await api('post', `/api/memories/${memory}/comments`, leaving, { content: 'my comment' });

    expect((await api('delete', '/api/auth/me', leaving, { password: 'wrong-pass' })).status).toBe(400);
    const res = await api('delete', '/api/auth/me', leaving, { password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.familiesDeleted).toBe(1);

    expect(await Family.findById(own)).toBeNull();
    expect((await Family.findById(joined)).collaborators).toHaveLength(0);
    const kept = await api('get', `/api/memories/${memory}`, other);
    expect(kept.status).toBe(200);
    expect(kept.body.memory.author).toBeNull(); // shown as "Former member" in the app
    expect(kept.body.memory.commentCount).toBe(0);
    expect((await api('get', '/api/auth/me', leaving)).status).toBe(401);
  });
});
