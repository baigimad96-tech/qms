/**
 * Email domain typo detection and suggestion utility.
 * Helps detect common mistyped email domains (e.g., @gamil.com -> @gmail.com)
 * and suggests the corrected email address.
 */

export const KNOWN_DOMAIN_TYPOS = {
  // Gmail typos
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gamail.com': 'gmail.com',
  'gmaild.com': 'gmail.com',
  'gmaio.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gamil.co': 'gmail.com',
  'gamil.con': 'gmail.com',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'ymail.con': 'ymail.com',

  // Hotmail typos
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotamail.com': 'hotmail.com',
  'homail.com': 'hotmail.com',

  // Outlook typos
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com',

  // iCloud typos
  'icld.com': 'icloud.com',
  'iclould.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icloud.co': 'icloud.com',
};

export const POPULAR_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'live.com',
  'proton.me',
  'protonmail.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'hotmail.co.uk',
];

/**
 * Calculates Levenshtein edit distance between two strings
 */
function levenshtein(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        m[i][j] = m[i - 1][j - 1];
      } else {
        m[i][j] = Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
  }
  return m[b.length][a.length];
}

/**
 * Checks an email address for domain typos and returns the suggested corrected email.
 * Returns null if the domain appears valid or no close match is found.
 *
 * @param {string} email
 * @returns {string|null} suggested email (e.g. "shayaan@gmail.com") or null
 */
export function suggestEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1 || atIndex === 0 || atIndex === trimmed.length - 1) return null;

  const user = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();

  // Known dictionary typo
  if (KNOWN_DOMAIN_TYPOS[domain]) {
    return `${user}@${KNOWN_DOMAIN_TYPOS[domain]}`;
  }

  // Already a known exact domain
  if (POPULAR_DOMAINS.includes(domain)) {
    return null;
  }

  // Fuzzy Levenshtein match against popular domains
  for (const target of POPULAR_DOMAINS) {
    const dist = levenshtein(domain, target);
    if (dist > 0 && dist <= 2 && Math.abs(domain.length - target.length) <= 2) {
      return `${user}@${target}`;
    }
  }

  return null;
}
