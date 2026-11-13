// Hand-written OpenAPI spec, shown at /api-docs
const idParam = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const json = (props, required = []) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', required, properties: props } } },
});
const s = { type: 'string' };
const ok = (description) => ({ description });
const secured = [{ bearerAuth: [] }];
const common = { 400: ok('Validation error / bad ID'), 401: ok('Not logged in'), 403: ok('No access to this family'), 404: ok('Not found') };

const spec = {
  openapi: '3.0.3',
  info: { title: 'ParamPara API', version: '1.0.0', description: 'Family heritage and memory platform. Log in, then click Authorize and paste the token.' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], summary: 'Create an account', requestBody: json({ name: s, email: s, password: { type: 'string', minLength: 8 } }, ['name', 'email', 'password']), responses: { 201: ok('Account created, returns token'), 400: ok('Validation error'), 409: ok('Email already registered') } } },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'Log in', requestBody: json({ email: s, password: s }, ['email', 'password']), responses: { 200: ok('Returns token'), 401: ok('Invalid email or password') } } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok('User'), 401: ok('Not logged in') } } },

    '/api/families': {
      post: { tags: ['Families'], summary: 'Create a family (you become owner)', security: secured, requestBody: json({ name: s, description: s }, ['name']), responses: { 201: ok('Created'), 400: ok('Validation error'), 401: ok('Not logged in') } },
      get: { tags: ['Families'], summary: 'Families you own or collaborate on', security: secured, responses: { 200: ok('List'), 401: ok('Not logged in') } },
    },
    '/api/families/{id}': {
      get: { tags: ['Families'], summary: 'Get a family', security: secured, parameters: [idParam()], responses: { 200: ok('Family'), ...common } },
      patch: { tags: ['Families'], summary: 'Update name/description (owner only)', security: secured, parameters: [idParam()], requestBody: json({ name: s, description: s }), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Families'], summary: 'Delete family and everything in it (owner only)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },
    '/api/families/{id}/collaborators': { post: { tags: ['Families'], summary: 'Add a collaborator by email (owner only)', security: secured, parameters: [idParam()], requestBody: json({ email: s }, ['email']), responses: { 201: ok('Added'), 409: ok('Already a collaborator'), ...common } } },
    '/api/families/{id}/collaborators/{userId}': { delete: { tags: ['Families'], summary: 'Remove a collaborator (owner only)', security: secured, parameters: [idParam(), idParam('userId')], responses: { 200: ok('Removed'), ...common } } },

    '/api/families/{id}/members': {
      post: { tags: ['Members'], summary: 'Add a family member', security: secured, parameters: [idParam()], requestBody: json({ name: s, birthDate: { type: 'string', format: 'date' }, bio: s }, ['name']), responses: { 201: ok('Created'), ...common } },
      get: { tags: ['Members'], summary: 'List members of a family', security: secured, parameters: [idParam()], responses: { 200: ok('List'), ...common } },
    },
    '/api/members/{id}': {
      get: { tags: ['Members'], summary: 'Get a member', security: secured, parameters: [idParam()], responses: { 200: ok('Member'), ...common } },
      patch: { tags: ['Members'], summary: 'Update a member', security: secured, parameters: [idParam()], requestBody: json({ name: s, birthDate: s, bio: s }), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Members'], summary: 'Delete a member (also removes their relationships and memory tags)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },

    '/api/relationships': { post: { tags: ['Relationships'], summary: 'Create a relationship: source is the <type> of target', security: secured, requestBody: json({ source: s, target: s, type: { type: 'string', enum: ['parent', 'child', 'spouse', 'sibling'] } }, ['source', 'target', 'type']), responses: { 201: ok('Created'), 409: ok('Duplicate'), ...common } } },
    '/api/members/{id}/relationships': { get: { tags: ['Relationships'], summary: 'Relationships of a member', security: secured, parameters: [idParam()], responses: { 200: ok('List'), ...common } } },
    '/api/relationships/{id}': {
      patch: { tags: ['Relationships'], summary: 'Change the type', security: secured, parameters: [idParam()], requestBody: json({ type: { type: 'string', enum: ['parent', 'child', 'spouse', 'sibling'] } }, ['type']), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Relationships'], summary: 'Delete a relationship', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },

    '/api/memories': {
      post: { tags: ['Memories'], summary: 'Create a memory', security: secured, requestBody: json({ family: s, title: s, content: s, category: { type: 'string', enum: ['Story', 'Recipe', 'Photograph', 'Letter', 'Family event', 'Tradition', 'Achievement', 'Other'] }, eventDate: { type: 'string', format: 'date' }, location: s, mediaUrl: s, people: { type: 'array', items: s } }, ['family', 'title', 'content']), responses: { 201: ok('Created'), ...common } },
      get: { tags: ['Memories'], summary: 'List memories of a family', security: secured, parameters: [
        { name: 'family', in: 'query', required: true, schema: s },
        { name: 'category', in: 'query', schema: s }, { name: 'author', in: 'query', schema: s },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'q', in: 'query', description: 'Search title and content', schema: s },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'event'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', description: 'Max 50', schema: { type: 'integer', default: 10 } },
      ], responses: { 200: ok('Paginated list'), ...common } },
    },
    '/api/memories/{id}': {
      get: { tags: ['Memories'], summary: 'Get a memory', security: secured, parameters: [idParam()], responses: { 200: ok('Memory'), ...common } },
      patch: { tags: ['Memories'], summary: 'Update (author or family owner)', security: secured, parameters: [idParam()], requestBody: json({ title: s, content: s, category: s, eventDate: s, location: s, mediaUrl: s, people: { type: 'array', items: s } }), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Memories'], summary: 'Delete (author or family owner)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },
  },
};

// ---- added in version 1.1 ----
spec.paths['/api/auth/me'].patch = { tags: ['Auth'], summary: 'Change your display name', security: secured, requestBody: json({ name: s }, ['name']), responses: { 200: ok('Updated'), 400: ok('Validation error'), 401: ok('Not logged in') } };
spec.paths['/api/auth/change-password'] = { post: { tags: ['Auth'], summary: 'Change your password', security: secured, requestBody: json({ currentPassword: s, newPassword: { type: 'string', minLength: 8, maxLength: 72 } }, ['currentPassword', 'newPassword']), responses: { 200: ok('Changed'), 400: ok('Wrong current password / validation error'), 401: ok('Not logged in') } } };
spec.paths['/api/families/{id}/leave'] = { delete: { tags: ['Families'], summary: 'Leave a family (collaborators only)', security: secured, parameters: [idParam()], responses: { 200: ok('Left'), 400: ok('Owner cannot leave'), ...common } } };
spec.paths['/api/families/{id}/invitations'] = { post: { tags: ['Invitations'], summary: 'Create a single-use invite link token, valid 7 days (owner only). The token is shown only once.', security: secured, parameters: [idParam()], responses: { 201: ok('Returns token and expiresAt'), 429: ok('Too many pending invitations'), ...common } } };
spec.paths['/api/invitations/{token}'] = { get: { tags: ['Invitations'], summary: 'Preview the family an invitation is for', security: secured, parameters: [idParam('token')], responses: { 200: ok('Family name and description'), 404: ok('Invalid or expired'), 410: ok('Already used') } } };
spec.paths['/api/invitations/{token}/accept'] = { post: { tags: ['Invitations'], summary: 'Join the family as collaborator', security: secured, parameters: [idParam('token')], responses: { 200: ok('Joined (or already a member)'), 404: ok('Invalid or expired'), 410: ok('Already used') } } };
spec.paths['/api/families/{id}/stats'] = { get: { tags: ['Family views'], summary: 'Counts of members, memories, relationships and memories per category', security: secured, parameters: [idParam()], responses: { 200: ok('Stats'), ...common } } };
spec.paths['/api/families/{id}/relationships'] = { get: { tags: ['Family views'], summary: 'All relationships in a family (with names)', security: secured, parameters: [idParam()], responses: { 200: ok('List'), ...common } } };
spec.paths['/api/families/{id}/tree'] = { get: { tags: ['Family views'], summary: 'Members grouped into generations, ready to draw a family tree', security: secured, parameters: [idParam()], responses: { 200: ok('generations[], relationships[], hasCycle'), ...common } } };
spec.paths['/api/families/{id}/timeline'] = { get: { tags: ['Family views'], summary: 'Dated memories grouped by year', security: secured, parameters: [idParam(), { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'limit', in: 'query', description: 'Max 200', schema: { type: 'integer', default: 100 } }], responses: { 200: ok('Years with memories'), ...common } } };
spec.paths['/api/memories'].get.parameters.splice(3, 0, { name: 'person', in: 'query', description: 'Only memories that tag this member', schema: s });
spec.info.version = '1.1.0';
spec.paths['/api/health'] = { get: { tags: ['Platform'], summary: 'Is the server running?', responses: { 200: ok('OK') } } };
spec.paths['/api/health/ready'] = { get: { tags: ['Platform'], summary: 'Is the server connected to the database?', responses: { 200: ok('Ready'), 503: ok('Database not connected') } } };

// ---- added in version 2.0 ----
const role = { type: 'string', enum: ['editor', 'viewer'] };
const q = (name, schema = s, description) => ({ name, in: 'query', schema, ...(description && { description }) });
spec.info.version = '2.0.0';
spec.info.description = 'Family heritage and memory platform. Log in, then click Authorize and paste the token. Roles: owner (everything), editor (add/edit content), viewer (read and comment).';
Object.assign(spec.paths, {
  '/api/config': { get: { tags: ['Platform'], summary: 'Which optional features are on (email, photo uploads)', responses: { 200: ok('features') } } },
  '/api/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Email a reset link (same answer whether or not the email exists)', requestBody: json({ email: s }, ['email']), responses: { 200: ok('Sent if the account exists'), 429: ok('Too many attempts'), 503: ok('Email not set up') } } },
  '/api/auth/reset-password': { post: { tags: ['Auth'], summary: 'Set a new password with the emailed token. Logs out every other session.', requestBody: json({ token: s, password: { type: 'string', minLength: 8, maxLength: 72 } }, ['token', 'password']), responses: { 200: ok('Returns a new token'), 400: ok('Invalid or expired link') } } },
  '/api/auth/logout-all': { post: { tags: ['Auth'], summary: 'End every other session. Returns a fresh token for this device.', security: secured, responses: { 200: ok('New token'), 401: ok('Not logged in') } } },
  '/api/families/{id}/collaborators/{userId}': {
    ...spec.paths['/api/families/{id}/collaborators/{userId}'],
    patch: { tags: ['Families'], summary: 'Change someone\'s role (owner only)', security: secured, parameters: [idParam(), idParam('userId')], requestBody: json({ role }, ['role']), responses: { 200: ok('Changed'), ...common } },
  },
  '/api/families/{id}/activity': { get: { tags: ['Family views'], summary: 'Recent activity feed, newest first', security: secured, parameters: [idParam(), q('limit', { type: 'integer', default: 20 }, 'Max 50'), q('before', { type: 'string', format: 'date-time' }, 'Use nextBefore from the previous page')], responses: { 200: ok('activity[], nextBefore'), ...common } } },
  '/api/families/{id}/export': { get: { tags: ['Family views'], summary: 'Download the whole archive as JSON (owner only)', security: secured, parameters: [idParam()], responses: { 200: ok('JSON file'), ...common } } },
  '/api/memories/{id}/comments': {
    get: { tags: ['Comments'], summary: 'Comments on a memory, oldest first', security: secured, parameters: [idParam()], responses: { 200: ok('List'), ...common } },
    post: { tags: ['Comments'], summary: 'Add a comment (any role, viewers too)', security: secured, parameters: [idParam()], requestBody: json({ content: s }, ['content']), responses: { 201: ok('Created'), ...common } },
  },
  '/api/comments/{id}': { delete: { tags: ['Comments'], summary: 'Delete (comment writer or family owner)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } } },
  '/api/uploads/signature': { post: { tags: ['Uploads'], summary: 'Get a signed Cloudinary upload (owner/editor). Then POST the file with these fields straight to uploadUrl.', security: secured, requestBody: json({ family: s }, ['family']), responses: { 200: ok('uploadUrl + fields'), 503: ok('Uploads not set up'), ...common } } },
});
spec.paths['/api/auth/me'].delete = { tags: ['Auth'], summary: 'Delete your account (families you own are deleted too)', security: secured, requestBody: json({ password: s }, ['password']), responses: { 200: ok('Deleted'), 400: ok('Wrong password'), 401: ok('Not logged in') } };
spec.paths['/api/families/{id}/collaborators'].post.requestBody = json({ email: s, role }, ['email']);
spec.paths['/api/families/{id}/invitations'].post.requestBody = { required: false, content: { 'application/json': { schema: { type: 'object', properties: { role } } } } };
const memberProps = { name: s, nickname: s, gender: { type: 'string', enum: ['', 'female', 'male', 'other'] }, birthDate: { type: 'string', format: 'date' }, deathDate: { type: 'string', format: 'date' }, birthPlace: s, photoUrl: s, bio: s };
spec.paths['/api/families/{id}/members'].post.requestBody = json(memberProps, ['name']);
spec.paths['/api/members/{id}'].patch.requestBody = json(memberProps);
spec.paths['/api/members/{id}'].get.summary = 'Get a member with their relationships and memory count';

module.exports = spec;
