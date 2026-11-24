export function computeSkillBadges(user, userSkills = []) {
  const badges = [];
  const sessions = Number(user?.completedSessions || 0);
  const points = Number(user?.contributionPoints || 0);

  if (sessions >= 1) {
    badges.push({
      id: 'first-assist',
      name: 'First Assist',
      description: 'Completed your first peer mentoring session',
    });
  }
  if (sessions >= 5) {
    badges.push({
      id: 'campus-mentor',
      name: 'Campus Mentor',
      description: 'Guided peers through 5+ live help sessions',
    });
  }
  if (sessions >= 10) {
    badges.push({
      id: 'trusted-guide',
      name: 'Trusted Guide',
      description: 'Completed 10+ mentoring sessions on QuickFix',
    });
  }
  if (points >= 100) {
    badges.push({
      id: 'century-contributor',
      name: 'Century Contributor',
      description: 'Earned 100+ contribution points helping classmates',
    });
  }
  if (userSkills.some((us) => us.proficiency === 'Advanced')) {
    badges.push({
      id: 'domain-specialist',
      name: 'Domain Specialist',
      description: 'Verified Advanced proficiency in one or more skills',
    });
  }
  if (userSkills.length >= 4) {
    badges.push({
      id: 'versatile-peer',
      name: 'Versatile Peer',
      description: 'Listed 4+ technical or academic skills on profile',
    });
  }

  return badges;
}
