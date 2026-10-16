// Shared validation patterns used by both the Mongoose schemas and the request validators.

// Pragmatic email format check (the request validators additionally use validator.js isEmail).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Letters, numbers, underscores, dots and hyphens.
const USERNAME_REGEX = /^[a-z0-9_.-]+$/i;

// Unicode letters plus spaces, apostrophes, periods and hyphens (e.g. "Mary-Jane", "O'Neil", "José").
const PERSON_NAME_REGEX = /^[\p{L}\p{M}' .-]+$/u;

module.exports = { EMAIL_REGEX, USERNAME_REGEX, PERSON_NAME_REGEX };
