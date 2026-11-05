import 'dotenv/config';
export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET phải có ít nhất 32 ký tự.');
  return secret;
}
