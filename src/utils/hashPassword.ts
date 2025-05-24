import bcrypt from "bcryptjs";

export async function hashPassword(password: string, saltRounds = 10): Promise<string> {
  if (saltRounds < 4 || saltRounds > 31) {
    throw new Error("saltRounds must be between 4 and 31");
  }
  return await bcrypt.hash(password, saltRounds);
}
