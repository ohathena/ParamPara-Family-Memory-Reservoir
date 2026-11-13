// Run: node postman/make.js  -> writes postman/ParamPara.postman_collection.json
const fs = require('fs');
const U = '{{baseUrl}}';
const save = (v, path) => `pm.collectionVariables.set('${v}', pm.response.json().${path});`;
const status = (code) => `pm.test('status is ${code}', () => pm.response.to.have.status(${code}));`;

const req = (name, method, path, body, { token = true, tests = [], other } = {}) => ({
  name,
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }],
  request: {
    method,
    header: [
      { key: 'Content-Type', value: 'application/json' },
      ...(token ? [{ key: 'Authorization', value: `Bearer {{${other || 'token'}}}` }] : []),
    ],
    url: { raw: `${U}${path}`, host: [U], path: path.replace(/^\//, '').split('/') },
    ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2) } } : {}),
  },
});

const items = [
  { name: '1. Auth', item: [
    req('Register user A', 'POST', '/api/auth/register', { name: 'Rir', email: 'rir_{{run}}@test.com', password: 'password123' }, { token: false, tests: [status(201), save('token', 'token')] }),
    req('Register duplicate email (409)', 'POST', '/api/auth/register', { name: 'Rir', email: 'rir_{{run}}@test.com', password: 'password123' }, { token: false, tests: [status(409)] }),
    req('Register missing fields (400)', 'POST', '/api/auth/register', { email: 'x@test.com' }, { token: false, tests: [status(400)] }),
    req('Login wrong password (401)', 'POST', '/api/auth/login', { email: 'rir_{{run}}@test.com', password: 'wrongpass' }, { token: false, tests: [status(401)] }),
    req('Login OK', 'POST', '/api/auth/login', { email: 'rir_{{run}}@test.com', password: 'password123' }, { token: false, tests: [status(200), save('token', 'token')] }),
    req('Me without token (401)', 'GET', '/api/auth/me', null, { token: false, tests: [status(401)] }),
    req('Me with token', 'GET', '/api/auth/me', null, { tests: [status(200)] }),
    req('Register user B (outsider)', 'POST', '/api/auth/register', { name: 'Outsider', email: 'out_{{run}}@test.com', password: 'password123' }, { token: false, tests: [status(201), save('tokenB', 'token')] }),
  ]},
  { name: '2. Families', item: [
    req('Create family', 'POST', '/api/families', { name: 'Sharma Family', description: 'Our roots' }, { tests: [status(201), save('familyId', 'family._id')] }),
    req('Create family without name (400)', 'POST', '/api/families', { description: 'x' }, { tests: [status(400)] }),
    req('List my families', 'GET', '/api/families', null, { tests: [status(200)] }),
    req('Get family', 'GET', '/api/families/{{familyId}}', null, { tests: [status(200)] }),
    req('Update family', 'PATCH', '/api/families/{{familyId}}', { description: 'Updated' }, { tests: [status(200)] }),
    req('Malformed family id (400)', 'GET', '/api/families/123', null, { tests: [status(400)] }),
    req('Outsider reads family (403)', 'GET', '/api/families/{{familyId}}', null, { other: 'tokenB', tests: [status(403)] }),
    req('Outsider updates family (403)', 'PATCH', '/api/families/{{familyId}}', { name: 'Hacked' }, { other: 'tokenB', tests: [status(403)] }),
  ]},
  { name: '3. Members', item: [
    req('Add member Asha', 'POST', '/api/families/{{familyId}}/members', { name: 'Asha', bio: 'Grandmother' }, { tests: [status(201), save('memberA', 'member._id')] }),
    req('Add member Ravi', 'POST', '/api/families/{{familyId}}/members', { name: 'Ravi', birthDate: '1990-05-01' }, { tests: [status(201), save('memberB', 'member._id')] }),
    req('Add member without name (400)', 'POST', '/api/families/{{familyId}}/members', { bio: 'x' }, { tests: [status(400)] }),
    req('List members', 'GET', '/api/families/{{familyId}}/members', null, { tests: [status(200)] }),
    req('Get member', 'GET', '/api/members/{{memberA}}', null, { tests: [status(200)] }),
    req('Update member', 'PATCH', '/api/members/{{memberA}}', { bio: 'Loves cooking' }, { tests: [status(200)] }),
    req('Outsider reads member (403)', 'GET', '/api/members/{{memberA}}', null, { other: 'tokenB', tests: [status(403)] }),
  ]},
  { name: '4. Relationships', item: [
    req('Create relationship (Asha parent of Ravi)', 'POST', '/api/relationships', { source: '{{memberA}}', target: '{{memberB}}', type: 'parent' }, { tests: [status(201), save('relId', 'relationship._id')] }),
    req('Duplicate relationship (409)', 'POST', '/api/relationships', { source: '{{memberA}}', target: '{{memberB}}', type: 'parent' }, { tests: [status(409)] }),
    req('Self relationship (400)', 'POST', '/api/relationships', { source: '{{memberA}}', target: '{{memberA}}', type: 'sibling' }, { tests: [status(400)] }),
    req('Invalid type (400)', 'POST', '/api/relationships', { source: '{{memberA}}', target: '{{memberB}}', type: 'cousin' }, { tests: [status(400)] }),
    req('Bad member id (400)', 'POST', '/api/relationships', { source: 'abc', target: '{{memberB}}', type: 'parent' }, { tests: [status(400)] }),
    req('List relationships of member', 'GET', '/api/members/{{memberA}}/relationships', null, { tests: [status(200)] }),
    req('Update relationship type', 'PATCH', '/api/relationships/{{relId}}', { type: 'child' }, { tests: [status(200)] }),
    req('Outsider deletes relationship (403)', 'DELETE', '/api/relationships/{{relId}}', null, { other: 'tokenB', tests: [status(403)] }),
  ]},
  { name: '5. Memories', item: [
    req('Create memory', 'POST', '/api/memories', { family: '{{familyId}}', title: 'Diwali 1998', content: 'We lit hundreds of diyas.', category: 'Family event', eventDate: '1998-11-07', location: 'Dharamshala', people: ['{{memberA}}', '{{memberB}}'] }, { tests: [status(201), save('memoryId', 'memory._id')] }),
    req('Create memory invalid category (400)', 'POST', '/api/memories', { family: '{{familyId}}', title: 'x', content: 'y', category: 'Nonsense' }, { tests: [status(400)] }),
    req('Create memory missing content (400)', 'POST', '/api/memories', { family: '{{familyId}}', title: 'x' }, { tests: [status(400)] }),
    req('Outsider creates memory (403)', 'POST', '/api/memories', { family: '{{familyId}}', title: 'x', content: 'y' }, { other: 'tokenB', tests: [status(403)] }),
    req('List memories (filter+paginate)', 'GET', '/api/memories?family={{familyId}}&category=Family event&page=1&limit=5&sort=event&q=diyas', null, { tests: [status(200)] }),
    req('List memories without family (400)', 'GET', '/api/memories', null, { tests: [status(400)] }),
    req('Get memory', 'GET', '/api/memories/{{memoryId}}', null, { tests: [status(200)] }),
    req('Update memory', 'PATCH', '/api/memories/{{memoryId}}', { title: 'Diwali 1998 (edited)' }, { tests: [status(200)] }),
    req('Outsider updates memory (403)', 'PATCH', '/api/memories/{{memoryId}}', { title: 'Hacked' }, { other: 'tokenB', tests: [status(403)] }),
    req('Outsider deletes memory (403)', 'DELETE', '/api/memories/{{memoryId}}', null, { other: 'tokenB', tests: [status(403)] }),
    req('Delete memory', 'DELETE', '/api/memories/{{memoryId}}', null, { tests: [status(200)] }),
    req('Get deleted memory (404)', 'GET', '/api/memories/{{memoryId}}', null, { tests: [status(404)] }),
  ]},
];

const collection = {
  info: { name: 'ParamPara API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000' },
    { key: 'run', value: String(Date.now()) },
  ],
  item: items,
};
fs.writeFileSync(__dirname + '/ParamPara.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('written');
