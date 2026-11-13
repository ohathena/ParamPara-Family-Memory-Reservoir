const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest-only-123456';
const app = require('../src/app');

let mongod;
beforeAll(async () => {
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI); // your own test database
    await mongoose.connection.dropDatabase();
    await mongoose.connection.syncIndexes(); // dropping the database also dropped the indexes (unique email, TTL...)
  } else {
    mongod = await MongoMemoryServer.create(); // temporary in-memory database, your Atlas data is not touched
    await mongoose.connect(mongod.getUri());
  }
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const register = async (name) => {
  const res = await request(app).post('/api/auth/register').send({ name, email: `${name}@test.com`, password: 'password123' });
  return res.body.token;
};
const as = (token) => ({ Authorization: `Bearer ${token}` });

describe('auth', () => {
  test('register, duplicate email, login, me', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Rir', email: 'rir@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.password).toBeUndefined();

    const dup = await request(app).post('/api/auth/register').send({ name: 'Rir', email: 'RIR@test.com', password: 'password123' });
    expect(dup.status).toBe(409);

    const bad = await request(app).post('/api/auth/login').send({ email: 'rir@test.com', password: 'wrongpass1' });
    expect(bad.status).toBe(401);

    const login = await request(app).post('/api/auth/login').send({ email: 'rir@test.com', password: 'password123' });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set(as(login.body.token));
    expect(me.body.user.email).toBe('rir@test.com');
  });

  test('protected routes reject missing and invalid tokens', async () => {
    expect((await request(app).get('/api/families')).status).toBe(401);
    expect((await request(app).get('/api/families').set(as('garbage'))).status).toBe(401);
  });

  test('validation errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('families, members, relationships, memories', () => {
  let owner, outsider, familyId, a, b, memoryId;

  beforeAll(async () => {
    owner = await register('owner');
    outsider = await register('outsider');
    const fam = await request(app).post('/api/families').set(as(owner)).send({ name: 'Sharma' });
    familyId = fam.body.family._id;
    a = (await request(app).post(`/api/families/${familyId}/members`).set(as(owner)).send({ name: 'Asha' })).body.member._id;
    b = (await request(app).post(`/api/families/${familyId}/members`).set(as(owner)).send({ name: 'Ravi' })).body.member._id;
  });

  test('outsider is blocked from family data', async () => {
    expect((await request(app).get(`/api/families/${familyId}`).set(as(outsider))).status).toBe(403);
    expect((await request(app).patch(`/api/families/${familyId}`).set(as(outsider)).send({ name: 'Hacked' })).status).toBe(403);
    expect((await request(app).get(`/api/families/${familyId}/members`).set(as(outsider))).status).toBe(403);
    expect((await request(app).get(`/api/members/${a}`).set(as(outsider))).status).toBe(403);
  });

  test('malformed and missing ids', async () => {
    expect((await request(app).get('/api/families/123').set(as(owner))).status).toBe(400);
    expect((await request(app).get(`/api/families/${new mongoose.Types.ObjectId()}`).set(as(owner))).status).toBe(404);
  });

  test('relationship rules', async () => {
    const make = (body) => request(app).post('/api/relationships').set(as(owner)).send(body);
    expect((await make({ source: a, target: b, type: 'parent' })).status).toBe(201);
    expect((await make({ source: a, target: b, type: 'parent' })).status).toBe(409); // duplicate
    expect((await make({ source: a, target: a, type: 'sibling' })).status).toBe(400); // self
    expect((await make({ source: a, target: b, type: 'cousin' })).status).toBe(400); // bad type

    // member from a different family
    const fam2 = (await request(app).post('/api/families').set(as(owner)).send({ name: 'Other' })).body.family._id;
    const other = (await request(app).post(`/api/families/${fam2}/members`).set(as(owner)).send({ name: 'Stranger' })).body.member._id;
    expect((await make({ source: a, target: other, type: 'sibling' })).status).toBe(400);
  });

  test('memory CRUD, filters and pagination', async () => {
    const create = await request(app).post('/api/memories').set(as(owner)).send({
      family: familyId, title: 'Diwali 1998', content: 'Hundreds of diyas', category: 'Family event', eventDate: '1998-11-07', people: [a, b],
    });
    expect(create.status).toBe(201);
    memoryId = create.body.memory._id;

    const badCat = await request(app).post('/api/memories').set(as(owner)).send({ family: familyId, title: 'x', content: 'y', category: 'Nope' });
    expect(badCat.status).toBe(400);
    const noContent = await request(app).post('/api/memories').set(as(owner)).send({ family: familyId, title: 'x' });
    expect(noContent.status).toBe(400);

    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/memories').set(as(owner)).send({ family: familyId, title: `Recipe ${i}`, content: 'Dal', category: 'Recipe' });
    }
    const list = await request(app).get(`/api/memories?family=${familyId}&category=Recipe&limit=2&page=1`).set(as(owner));
    expect(list.body.total).toBe(3);
    expect(list.body.memories).toHaveLength(2);
    expect(list.body.pages).toBe(2);

    const search = await request(app).get(`/api/memories?family=${familyId}&q=diyas`).set(as(owner));
    expect(search.body.total).toBe(1);

    const upd = await request(app).patch(`/api/memories/${memoryId}`).set(as(owner)).send({ title: 'Diwali (edited)' });
    expect(upd.body.memory.title).toBe('Diwali (edited)');
  });

  test('outsider cannot read, edit or delete memories', async () => {
    expect((await request(app).get(`/api/memories/${memoryId}`).set(as(outsider))).status).toBe(403);
    expect((await request(app).patch(`/api/memories/${memoryId}`).set(as(outsider)).send({ title: 'x' })).status).toBe(403);
    expect((await request(app).delete(`/api/memories/${memoryId}`).set(as(outsider))).status).toBe(403);
    expect((await request(app).get(`/api/memories?family=${familyId}`).set(as(outsider))).status).toBe(403);
  });

  test('collaborator can add memories but cannot edit the family', async () => {
    const collab = await register('collab');
    const add = await request(app).post(`/api/families/${familyId}/collaborators`).set(as(owner)).send({ email: 'collab@test.com' });
    expect(add.status).toBe(201);
    const mem = await request(app).post('/api/memories').set(as(collab)).send({ family: familyId, title: 'Mine', content: 'Hello' });
    expect(mem.status).toBe(201);
    expect((await request(app).patch(`/api/families/${familyId}`).set(as(collab)).send({ name: 'x' })).status).toBe(403);
    // owner may delete a collaborator's memory
    expect((await request(app).delete(`/api/memories/${mem.body.memory._id}`).set(as(owner))).status).toBe(200);
  });

  test('deleting a member cleans up relationships and memory tags', async () => {
    expect((await request(app).delete(`/api/members/${b}`).set(as(owner))).status).toBe(200);
    const rels = await request(app).get(`/api/members/${a}/relationships`).set(as(owner));
    expect(rels.body.count).toBe(0);
    const mem = await request(app).get(`/api/memories/${memoryId}`).set(as(owner));
    expect(mem.body.memory.people).toHaveLength(1);
  });

  test('deleting a memory works and it is gone', async () => {
    expect((await request(app).delete(`/api/memories/${memoryId}`).set(as(owner))).status).toBe(200);
    expect((await request(app).get(`/api/memories/${memoryId}`).set(as(owner))).status).toBe(404);
  });
});
