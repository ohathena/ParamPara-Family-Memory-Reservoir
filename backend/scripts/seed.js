// DEVELOPMENT ONLY: fills the database with demo data.  Run: npm run seed
// Demo logins (password for all: password123)
//   demo@parampara.com    owner
//   priya@parampara.com   editor
//   nanaji@parampara.com  viewer
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Family = require('../src/models/Family');
const FamilyMember = require('../src/models/FamilyMember');
const Relationship = require('../src/models/Relationship');
const Memory = require('../src/models/Memory');
const Comment = require('../src/models/Comment');
const Activity = require('../src/models/Activity');
const Invitation = require('../src/models/Invitation');

const DEMO_EMAILS = ['demo@parampara.com', 'priya@parampara.com', 'nanaji@parampara.com'];

(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Do not seed production');
  await mongoose.connect(process.env.MONGO_URI);

  // remove the previous demo data so the script can be re-run
  const oldUsers = await User.find({ email: { $in: DEMO_EMAILS } });
  const oldFamilies = await Family.find({ owner: { $in: oldUsers.map((u) => u._id) } });
  for (const f of oldFamilies) {
    for (const M of [Comment, Memory, Relationship, FamilyMember, Activity, Invitation]) await M.deleteMany({ family: f._id });
    await f.deleteOne();
  }
  await User.deleteMany({ email: { $in: DEMO_EMAILS } });

  const hash = await bcrypt.hash('password123', 10);
  const [demo, priya, nanaji] = await User.create([
    { name: 'Aarav Thakur', email: DEMO_EMAILS[0], password: hash },
    { name: 'Priya Thakur', email: DEMO_EMAILS[1], password: hash },
    { name: 'Nana ji', email: DEMO_EMAILS[2], password: hash },
  ]);
  const family = await Family.create({
    name: 'The Thakur Family',
    description: 'Roots in the hills of Himachal. Stories, recipes and the people who made us.',
    owner: demo._id, collaborators: [priya._id], viewers: [nanaji._id],
  });
  const log = (actor, action, subjectType, subjectId, subjectLabel) =>
    Activity.create({ family: family._id, actor: actor._id, actorName: actor.name, action, subjectType, subjectId, subjectLabel });
  await log(demo, 'family.created', 'family', family._id, family.name);

  const mk = async (data) => {
    const m = await FamilyMember.create({ family: family._id, ...data });
    await log(demo, 'member.added', 'member', m._id, m.name);
    return m;
  };
  const dada = await mk({ name: 'Prem Singh Thakur', nickname: 'Dada ji', gender: 'male', birthDate: '1944-02-10', deathDate: '2016-11-03', birthPlace: 'Mandi', bio: 'Grandfather. Schoolteacher for 34 years, kept a diary every single day.' });
  const dadi = await mk({ name: 'Kamla Devi', nickname: 'Dadi', gender: 'female', birthDate: '1948-03-12', birthPlace: 'Palampur', bio: 'Grandmother. Makes the best siddu in the village.' });
  const papa = await mk({ name: 'Rajesh Thakur', nickname: 'Papa', gender: 'male', birthDate: '1974-08-02', birthPlace: 'Dharamshala', bio: 'Father. Worked in the electricity board.' });
  const chacha = await mk({ name: 'Sunil Thakur', nickname: 'Chacha ji', gender: 'male', birthDate: '1978-05-19', birthPlace: 'Dharamshala', bio: 'Uncle. Runs an apple orchard in Kotkhai.' });
  const mummy = await mk({ name: 'Sunita Thakur', nickname: 'Mummy', gender: 'female', birthDate: '1977-01-20', birthPlace: 'Shimla', bio: 'Mother. Keeps all the family recipes.' });
  const me = await mk({ name: 'Aarav Thakur', gender: 'male', birthDate: '2003-06-15', birthPlace: 'Chandigarh', bio: 'Engineering student. Started this archive.' });
  const sis = await mk({ name: 'Priya Thakur', gender: 'female', birthDate: '2006-09-09', birthPlace: 'Chandigarh', bio: 'Younger sister. Family photographer.' });

  const rel = (source, target, type) => Relationship.create({ family: family._id, source: source._id, target: target._id, type });
  await rel(dada, dadi, 'spouse');
  await rel(dada, papa, 'parent');
  await rel(dadi, papa, 'parent');
  await rel(dada, chacha, 'parent');
  await rel(papa, chacha, 'sibling');
  await rel(papa, mummy, 'spouse');
  await rel(papa, me, 'parent');
  await rel(mummy, me, 'parent');
  await rel(papa, sis, 'parent');
  await rel(me, sis, 'sibling');

  const mem = async (author, title, content, category, eventDate, location, people) => {
    const m = await Memory.create({ family: family._id, author: author._id, title, content, category, eventDate, location, people: people.map((p) => p._id) });
    await log(author, 'memory.created', 'memory', m._id, title);
    return m;
  };
  const siddu = await mem(demo, "Dadi's siddu recipe", 'Knead the dough with yeast and let it rest overnight near the chulha. Fill with poppy seeds, walnuts and a little jaggery, steam for 20 minutes, and serve with a spoon of ghee on top.\n\nDadi says the secret is patience, not ingredients.', 'Recipe', '2015-12-01', 'Dharamshala', [dadi]);
  await mem(demo, 'The winter we got snowed in', 'The road was closed for four days. The power went out on the first night, so we played carrom by candlelight and Dadi told stories from her childhood in Palampur. Dada ji read out his diary entry from the same date thirty years earlier.', 'Story', '2012-01-15', 'Dharamshala', [dadi, dada, papa, me]);
  await mem(priya, 'First day of engineering', 'Papa dropped Aarav at the bus stand and pretended he was not emotional. He waved until the bus turned the corner.', 'Achievement', '2021-09-01', 'Chandigarh', [papa, me]);
  await mem(demo, "Dada ji's diaries", 'Forty-two notebooks, one for every year from 1974 to 2016. Weather, prices of wheat, who visited, and one line about each of us. We are slowly typing them up.', 'Letter', '1974-01-01', 'Mandi', [dada]);
  await mem(priya, 'Apple harvest at Kotkhai', 'Every September the whole family goes to Chacha ji\'s orchard. Kids sort apples by size, elders argue about prices.', 'Tradition', '2019-09-14', 'Kotkhai', [chacha, papa, me, sis]);
  await mem(demo, "Papa and Mummy's wedding", 'Baraat walked uphill for an hour because the bus broke down. Mummy still laughs about it.', 'Family event', '2001-02-14', 'Shimla', [papa, mummy, dada, dadi]);

  await Comment.create([
    { family: family._id, memory: siddu._id, author: nanaji._id, content: 'Nobody makes it like her. I still remember the smell.' },
    { family: family._id, memory: siddu._id, author: priya._id, content: 'We tried it last Lohri, it came out flat. Need to ask Dadi again!' },
  ]);
  await Memory.updateOne({ _id: siddu._id }, { commentCount: 2 });
  await log(nanaji, 'comment.added', 'memory', siddu._id, siddu.title);

  console.log('Seeded. Log in with demo@parampara.com / password123 (also priya@ as editor, nanaji@ as viewer)');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
