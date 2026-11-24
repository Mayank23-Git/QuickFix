import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import {
  SESSION_COOKIE_NAME,
  getCookieOptions,
  signAuthToken,
} from '../middleware/auth.js';
import { asTrimmedString, escapeRegex } from '../utils/sanitize.js';

function formatUserResponse(userDoc) {
  return {
    _id: userDoc._id,
    fullName: userDoc.fullName,
    email: userDoc.email,
    college: userDoc.college || '',
    branch: userDoc.branch || '',
    academicYear: userDoc.academicYear || '',
    bio: userDoc.bio || '',
    avatarUrl: userDoc.avatarUrl || '',
    contributionPoints: userDoc.contributionPoints || 0,
    achievementXp: userDoc.achievementXp || 0,
    completedSessions: userDoc.completedSessions || 0,
    role: userDoc.role || 'student',
    themePreference: userDoc.themePreference || 'system',
    careerGoal: userDoc.careerGoal || '',
    learningInterests: userDoc.learningInterests || [],
    timezone: userDoc.timezone || 'UTC',
    currentStreak: userDoc.currentStreak || 0,
    longestStreak: userDoc.longestStreak || 0,
    totalLearningDays: userDoc.totalLearningDays || 0,
    isDemo: Boolean(userDoc.isDemo),
    createdAt: userDoc.createdAt,
  };
}

export async function signup(req, res) {
  try {
    const fullName = asTrimmedString(req.body?.fullName, 80);
    const email = asTrimmedString(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const college = asTrimmedString(req.body?.college, 120);
    const branch = asTrimmedString(req.body?.branch, 80);
    const academicYear = asTrimmedString(req.body?.academicYear, 30);

    if (fullName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password cannot exceed 128 characters.' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const allowedYears = ['', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'];
    const safeYear = allowedYears.includes(academicYear) ? academicYear : '';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      college,
      branch,
      academicYear: safeYear,
    });

    const token = signAuthToken(user._id);
    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));

    return res.status(201).json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('[Auth Signup Error]', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const email = asTrimmedString(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      user = await User.findOne({
        email: new RegExp(`^${escapeRegex(email)}$`, 'i'),
      }).select('+passwordHash');
    }

    if (!user || typeof user.passwordHash !== 'string' || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signAuthToken(user._id);
    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));

    return res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth Login Error]', error);
    return res.status(500).json({ error: 'Unable to sign in right now. Please try again.' });
  }
}

export async function getMe(req, res) {
  try {
    const userSkills = await UserSkill.find({ userId: req.user._id })
      .populate('skillId', 'name slug category')
      .lean();

    const freshToken = signAuthToken(req.user._id);

    return res.json({
      token: freshToken,
      user: {
        ...formatUserResponse(req.user),
        skills: userSkills
          .filter((us) => us.skillId)
          .map((us) => ({
            _id: us._id,
            skillId: us.skillId._id,
            name: us.skillId.name,
            slug: us.skillId.slug,
            category: us.skillId.category,
            proficiency: us.proficiency,
          })),
      },
    });
  } catch (error) {
    console.error('[Auth Me Error]', error);
    return res.status(500).json({ error: 'Failed to load user session.' });
  }
}

export async function logout(req, res) {
  const options = getCookieOptions(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    partitioned: options.partitioned,
    path: '/',
  });
  return res.json({ message: 'Signed out successfully.' });
}
