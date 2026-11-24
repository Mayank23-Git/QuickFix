import bcrypt from 'bcryptjs';
import { Skill } from '../models/Skill.js';
import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import { HelpRequest } from '../models/HelpRequest.js';
import { HelpSession } from '../models/HelpSession.js';
import { env } from '../config/env.js';
import { ensureAchievementCatalog } from '../services/xpService.js';

export const SKILL_CATALOG = [
  {
    name: 'C++',
    slug: 'cpp',
    category: 'Programming',
    keywords: ['c++', 'pointer', 'pointers', 'stl', 'vector', 'segfault', 'malloc', 'memory', 'reference', 'templates'],
    relatedSlugs: ['data-structures', 'dsa', 'operating-systems', 'java'],
  },
  {
    name: 'Java',
    slug: 'java',
    category: 'Programming',
    keywords: ['java', 'jvm', 'spring', 'oop', 'inheritance', 'hashmap', 'arraylist', 'multithreading'],
    relatedSlugs: ['cpp', 'dsa', 'data-structures', 'dbms'],
  },
  {
    name: 'Python',
    slug: 'python',
    category: 'Programming',
    keywords: ['python', 'pandas', 'numpy', 'flask', 'django', 'list comprehension', 'pip', 'venv'],
    relatedSlugs: ['machine-learning', 'ai-ml', 'dsa', 'sql'],
  },
  {
    name: 'JavaScript',
    slug: 'javascript',
    category: 'Programming',
    keywords: ['javascript', 'js', 'promise', 'async', 'await', 'closure', 'dom', 'fetch', 'es6', 'node'],
    relatedSlugs: ['react', 'web-development', 'html-css'],
  },
  {
    name: 'React',
    slug: 'react',
    category: 'Web & Systems',
    keywords: ['react', 'useeffect', 'usestate', 'hooks', 'jsx', 'component', 'props', 're-render', 'vite', 'router'],
    relatedSlugs: ['javascript', 'web-development', 'html-css'],
  },
  {
    name: 'HTML/CSS',
    slug: 'html-css',
    category: 'Web & Systems',
    keywords: ['html', 'css', 'flexbox', 'grid', 'tailwind', 'responsive', 'layout', 'overflow', 'margin'],
    relatedSlugs: ['web-development', 'react', 'javascript'],
  },
  {
    name: 'DSA',
    slug: 'dsa',
    category: 'Core CS',
    keywords: ['dsa', 'algorithm', 'sliding window', 'two pointer', 'dp', 'dynamic programming', 'recursion', 'binary search', 'graph', 'bfs', 'dfs'],
    relatedSlugs: ['data-structures', 'cpp', 'java', 'python', 'discrete-mathematics'],
  },
  {
    name: 'Data Structures',
    slug: 'data-structures',
    category: 'Core CS',
    keywords: ['linked list', 'tree', 'bst', 'heap', 'stack', 'queue', 'trie', 'hash table', 'array'],
    relatedSlugs: ['dsa', 'cpp', 'java', 'python'],
  },
  {
    name: 'DBMS',
    slug: 'dbms',
    category: 'Core CS',
    keywords: ['dbms', 'normalization', 'bcnf', '3nf', 'acid', 'transaction', 'indexing', 'b+ tree', 'er diagram'],
    relatedSlugs: ['sql', 'operating-systems'],
  },
  {
    name: 'SQL',
    slug: 'sql',
    category: 'Core CS',
    keywords: ['sql', 'join', 'inner join', 'left join', 'group by', 'having', 'subquery', 'postgres', 'mysql', 'query'],
    relatedSlugs: ['dbms', 'python'],
  },
  {
    name: 'Machine Learning',
    slug: 'machine-learning',
    category: 'Data & AI',
    keywords: ['machine learning', 'regression', 'classification', 'scikit', 'overfitting', 'gradient descent', 'svm', 'random forest'],
    relatedSlugs: ['ai-ml', 'python', 'mathematics'],
  },
  {
    name: 'AI/ML',
    slug: 'ai-ml',
    category: 'Data & AI',
    keywords: ['ai', 'neural network', 'pytorch', 'tensorflow', 'transformer', 'cnn', 'deep learning', 'backprop'],
    relatedSlugs: ['machine-learning', 'python', 'mathematics'],
  },
  {
    name: 'Mathematics',
    slug: 'mathematics',
    category: 'Mathematics',
    keywords: ['calculus', 'linear algebra', 'eigenvalue', 'matrix', 'probability', 'bayes', 'integral', 'derivative'],
    relatedSlugs: ['discrete-mathematics', 'machine-learning', 'aptitude'],
  },
  {
    name: 'Discrete Mathematics',
    slug: 'discrete-mathematics',
    category: 'Mathematics',
    keywords: ['discrete', 'induction', 'graph theory', 'recurrence', 'combinatorics', 'pigeonhole', 'set theory', 'logic', 'boolean'],
    relatedSlugs: ['mathematics', 'dsa', 'data-structures'],
  },
  {
    name: 'Computer Networks',
    slug: 'computer-networks',
    category: 'Core CS',
    keywords: ['tcp', 'udp', 'ip', 'subnetting', 'cidr', 'osi', 'http', 'dns', 'routing', 'socket'],
    relatedSlugs: ['operating-systems', 'web-development'],
  },
  {
    name: 'Operating Systems',
    slug: 'operating-systems',
    category: 'Core CS',
    keywords: ['os', 'deadlock', 'semaphore', 'mutex', 'scheduling', 'paging', 'virtual memory', 'process', 'thread', 'fork'],
    relatedSlugs: ['cpp', 'computer-networks', 'dbms'],
  },
  {
    name: 'Aptitude',
    slug: 'aptitude',
    category: 'Career & Aptitude',
    keywords: ['aptitude', 'permutation', 'combination', 'ratio', 'quantitative', 'placement', 'puzzle', 'logical reasoning'],
    relatedSlugs: ['mathematics', 'discrete-mathematics'],
  },
  {
    name: 'Web Development',
    slug: 'web-development',
    category: 'Web & Systems',
    keywords: ['express', 'rest api', 'jwt', 'cors', 'mongodb', 'backend', 'frontend', 'fullstack', 'deployment'],
    relatedSlugs: ['react', 'javascript', 'html-css', 'git-github'],
  },
  {
    name: 'Git/GitHub',
    slug: 'git-github',
    category: 'Web & Systems',
    keywords: ['git', 'github', 'merge conflict', 'rebase', 'branch', 'pull request', 'commit', 'cherry-pick'],
    relatedSlugs: ['web-development', 'javascript'],
  },
];

export async function ensureSkillsCatalog() {
  for (const item of SKILL_CATALOG) {
    await Skill.findOneAndUpdate(
      { slug: item.slug },
      { $set: item },
      { upsert: true, new: true }
    );
  }
  await ensureAchievementCatalog();
  return Skill.find().lean();
}

export async function seedDemoDataIfEmpty() {
  const skills = await ensureSkillsCatalog();
  if (!env.seedDemoData) return { seeded: false, reason: 'SEED_DEMO_DATA=false' };

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    return { seeded: false, reason: 'Users already exist' };
  }

  const skillBySlug = new Map(skills.map((s) => [s.slug, s]));
  const demoPasswordHash = await bcrypt.hash('PeerUpDemo!2026', 10);

  const demoUsersData = [
    {
      fullName: 'Aarav Mehta',
      email: 'aarav.demo@peerup.edu',
      passwordHash: demoPasswordHash,
      college: 'National Institute of Technology',
      branch: 'Computer Science & Engineering',
      academicYear: '3rd Year',
      bio: 'Systems & algorithms mentor. Happy to debug C++ memory issues, sliding window problems, and OS concurrency labs.',
      avatarUrl: '/src/assets/images/avatar_student_one_1795456563754.jpg',
      contributionPoints: 185,
      completedSessions: 7,
      isDemo: true,
    },
    {
      fullName: 'Ananya Rao',
      email: 'ananya.demo@peerup.edu',
      passwordHash: demoPasswordHash,
      college: 'State Engineering University',
      branch: 'Information Technology',
      academicYear: '4th Year',
      bio: 'Full-stack React & Express builder. I help juniors untangle hooks, SQL joins, and REST API state bugs.',
      avatarUrl: '/src/assets/images/avatar_student_two_1795456563811.jpg',
      contributionPoints: 150,
      completedSessions: 6,
      isDemo: true,
    },
    {
      fullName: 'Yuki Tanaka',
      email: 'yuki.demo@peerup.edu',
      passwordHash: demoPasswordHash,
      college: 'Institute of Science & Technology',
      branch: 'Mathematics & Computing',
      academicYear: '3rd Year',
      bio: 'Focus on discrete math proofs, graph theory, and Python ML workflows. Ask me anything about induction or linear algebra.',
      avatarUrl: '/src/assets/images/avatar_student_three_1795456563531.jpg',
      contributionPoints: 115,
      completedSessions: 4,
      isDemo: true,
    },
    {
      fullName: 'Maya Brooks',
      email: 'maya.demo@peerup.edu',
      passwordHash: demoPasswordHash,
      college: 'Metro Tech University',
      branch: 'Software Engineering',
      academicYear: '2nd Year',
      bio: 'Working through DBMS, SQL indexing, and React coursework. Always happy to pair up on frontend or Git merge workflows.',
      avatarUrl: '/src/assets/images/avatar_student_four_1795456563895.jpg',
      contributionPoints: 60,
      completedSessions: 2,
      isDemo: true,
    },
  ];

  const createdUsers = await User.insertMany(demoUsersData);
  const [aarav, ananya, yuki, maya] = createdUsers;

  const userSkillPairs = [
    { userId: aarav._id, slug: 'cpp', proficiency: 'Advanced' },
    { userId: aarav._id, slug: 'dsa', proficiency: 'Advanced' },
    { userId: aarav._id, slug: 'data-structures', proficiency: 'Advanced' },
    { userId: aarav._id, slug: 'operating-systems', proficiency: 'Intermediate' },

    { userId: ananya._id, slug: 'react', proficiency: 'Advanced' },
    { userId: ananya._id, slug: 'javascript', proficiency: 'Advanced' },
    { userId: ananya._id, slug: 'sql', proficiency: 'Advanced' },
    { userId: ananya._id, slug: 'dbms', proficiency: 'Intermediate' },
    { userId: ananya._id, slug: 'web-development', proficiency: 'Advanced' },

    { userId: yuki._id, slug: 'discrete-mathematics', proficiency: 'Advanced' },
    { userId: yuki._id, slug: 'mathematics', proficiency: 'Advanced' },
    { userId: yuki._id, slug: 'python', proficiency: 'Intermediate' },
    { userId: yuki._id, slug: 'machine-learning', proficiency: 'Intermediate' },

    { userId: maya._id, slug: 'html-css', proficiency: 'Advanced' },
    { userId: maya._id, slug: 'git-github', proficiency: 'Intermediate' },
    { userId: maya._id, slug: 'react', proficiency: 'Intermediate' },
    { userId: maya._id, slug: 'sql', proficiency: 'Beginner' },
  ];

  await UserSkill.insertMany(
    userSkillPairs
      .filter((p) => skillBySlug.has(p.slug))
      .map((p) => ({
        userId: p.userId,
        skillId: skillBySlug.get(p.slug)._id,
        proficiency: p.proficiency,
      }))
  );

  const now = Date.now();
  const demoRequests = [
    {
      authorId: maya._id,
      title: '[Demo] C++ pointer arithmetic & double-pointer segfault when resizing dynamic array',
      description:
        'In my Data Structures lab, I pass a `int** arr` to a resize helper function, increment the pointer inside a loop, and immediately hit a segmentation fault on dereference. Looking for a quick 15-minute walkthrough on pointer precedence and heap reallocation.',
      skillId: skillBySlug.get('cpp')._id,
      urgency: 'High',
      bountyPoints: 25,
      status: 'Open',
      isDemo: true,
      createdAt: new Date(now - 1000 * 60 * 35),
    },
    {
      authorId: aarav._id,
      title: '[Demo] SQL LEFT JOIN vs INNER JOIN duplicating rows with aggregate SUM()',
      description:
        'When joining `orders` and `order_items` with a third `payments` table, my `SUM(amount)` gets multiplied by the number of line items. Need help structuring a subquery or CTE so totals stay accurate.',
      skillId: skillBySlug.get('sql')._id,
      urgency: 'Medium',
      bountyPoints: 15,
      status: 'Open',
      isDemo: true,
      createdAt: new Date(now - 1000 * 60 * 95),
    },
    {
      authorId: maya._id,
      title: '[Demo] DSA array sliding window shrinking condition for longest substring with K distinct chars',
      description:
        'My two-pointer loop passes basic test cases, but when shrinking the left pointer `l`, my frequency map count does not decrement properly on duplicate characters. Would appreciate walking through a trace together.',
      skillId: skillBySlug.get('dsa')._id,
      urgency: 'High',
      bountyPoints: 20,
      status: 'Open',
      isDemo: true,
      createdAt: new Date(now - 1000 * 60 * 160),
    },
    {
      authorId: ananya._id,
      title: '[Demo] Discrete Mathematics strong induction proof for tree edges (E = V - 1)',
      description:
        'I understand the base case for V = 1, but I am getting stuck on the inductive step when splitting a tree by removing an edge into two smaller subtrees of size k and n - k. Need help tightening the proof wording before tomorrow’s quiz.',
      skillId: skillBySlug.get('discrete-mathematics')._id,
      urgency: 'Medium',
      bountyPoints: 10,
      status: 'Open',
      isDemo: true,
      createdAt: new Date(now - 1000 * 60 * 240),
    },
    {
      authorId: yuki._id,
      title: '[Demo] React useEffect infinite re-render loop when filtering fetched table state',
      description:
        'Every time my `useEffect` updates the filtered array state, the component re-renders and re-triggers the effect because of an object dependency. Looking for the cleanest React pattern to derive filtered state without extra effects.',
      skillId: skillBySlug.get('react')._id,
      urgency: 'Low',
      bountyPoints: 10,
      status: 'Open',
      isDemo: true,
      createdAt: new Date(now - 1000 * 60 * 320),
    },
    {
      authorId: yuki._id,
      title: '[Demo] Operating Systems Banker’s algorithm safety check matrix walkthrough',
      description:
        'Walked through Need = Max - Allocation and verified safe sequence `<P1, P3, P4, P0, P2>` during our 15-minute session.',
      skillId: skillBySlug.get('operating-systems')._id,
      urgency: 'Medium',
      bountyPoints: 15,
      status: 'Resolved',
      helperId: aarav._id,
      isDemo: true,
      createdAt: new Date(now - 1000 * 60 * 60 * 18),
    },
  ];

  const insertedRequests = await HelpRequest.insertMany(demoRequests);
  const resolvedDemoReq = insertedRequests[insertedRequests.length - 1];

  await HelpSession.create({
    requestId: resolvedDemoReq._id,
    requesterId: yuki._id,
    helperId: aarav._id,
    roomName: `PeerUp-Demo-${String(resolvedDemoReq._id).slice(-6)}`,
    status: 'Completed',
    startedAt: new Date(now - 1000 * 60 * 60 * 17),
    completedAt: new Date(now - 1000 * 60 * 60 * 16.75),
    duration: 15,
    rewarded: true,
    pointsAwarded: 35,
  });

  console.log('[PeerUp Seed] Seeded skill catalog and clearly marked demo accounts/doubts');
  return { seeded: true };
}
