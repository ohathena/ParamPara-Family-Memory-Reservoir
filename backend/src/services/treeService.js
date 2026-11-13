// Turns members + relationships into generations (rows) for the family tree page.
//   parent: source is the parent of target      child: source is the child of target
//   spouse / sibling: same generation
// Generation = how far down the tree someone is (0 = oldest known generation).
function buildTree(members, relationships) {
  const level = new Map(members.map((m) => [String(m._id), 0]));
  const parentLinks = []; // [parentId, childId]
  const peerLinks = []; // [a, b]

  for (const r of relationships) {
    const s = String(r.source);
    const t = String(r.target);
    if (r.type === 'parent') parentLinks.push([s, t]);
    else if (r.type === 'child') parentLinks.push([t, s]);
    else peerLinks.push([s, t]);
  }

  // Keep pushing levels down until nothing changes. The loop is capped, so a loop in the data (A parent of B, B parent of A) cannot hang the server.
  let changed = true;
  let rounds = 0;
  let hasCycle = false;
  while (changed) {
    if (rounds++ > members.length + 1) {
      hasCycle = true;
      break;
    }
    changed = false;
    for (const [p, c] of parentLinks) {
      if (level.has(p) && level.has(c) && level.get(c) < level.get(p) + 1) {
        level.set(c, level.get(p) + 1);
        changed = true;
      }
    }
    for (const [a, b] of peerLinks) {
      if (!level.has(a) || !level.has(b)) continue;
      const max = Math.max(level.get(a), level.get(b));
      if (level.get(a) !== max || level.get(b) !== max) {
        level.set(a, max);
        level.set(b, max);
        changed = true;
      }
    }
  }

  const rows = new Map();
  for (const m of members) {
    const l = level.get(String(m._id));
    if (!rows.has(l)) rows.set(l, []);
    rows.get(l).push({
      id: String(m._id), name: m.name, nickname: m.nickname || '', gender: m.gender || '',
      birthDate: m.birthDate || null, deathDate: m.deathDate || null, photoUrl: m.photoUrl || '',
    });
  }
  const generations = [...rows.keys()]
    .sort((a, b) => a - b)
    .map((l) => ({ level: l, members: rows.get(l).sort((a, b) => a.name.localeCompare(b.name)) }));

  return {
    generations,
    relationships: relationships.map((r) => ({ id: String(r._id), source: String(r.source), target: String(r.target), type: r.type })),
    hasCycle,
  };
}

module.exports = { buildTree };
