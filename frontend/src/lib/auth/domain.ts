export const OSAKA_UNIVERSITY_EMAIL_DOMAIN = "@ecs.osaka-u.ac.jp";

export function isOsakaUniversityEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(OSAKA_UNIVERSITY_EMAIL_DOMAIN);
}
