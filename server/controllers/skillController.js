import { Skill } from '../models/Skill.js';
import { suggestSkillFromText } from '../services/matchingService.js';
import { asTrimmedString, escapeRegex } from '../utils/sanitize.js';

export async function listSkills(req, res) {
  try {
    const search = asTrimmedString(req.query?.search, 60);
    const category = asTrimmedString(req.query?.category, 40);

    const query = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.name = new RegExp(escapeRegex(search), 'i');
    }

    const skills = await Skill.find(query).sort({ category: 1, name: 1 }).lean();
    return res.json({ skills });
  } catch (error) {
    console.error('[List Skills Error]', error);
    return res.status(500).json({ error: 'Failed to load skill catalog.' });
  }
}

export async function suggestSkill(req, res) {
  try {
    const title = asTrimmedString(req.body?.title, 140);
    const description = asTrimmedString(req.body?.description, 3000);
    const skills = await Skill.find().lean();
    const suggestion = suggestSkillFromText(title, description, skills);
    return res.json({
      suggestion: suggestion
        ? {
            skillId: suggestion.skill._id,
            name: suggestion.skill.name,
            method: suggestion.method,
          }
        : null,
    });
  } catch (error) {
    console.error('[Suggest Skill Error]', error);
    return res.status(500).json({ error: 'Failed to suggest skill.' });
  }
}
