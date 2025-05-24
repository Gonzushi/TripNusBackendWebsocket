import { hashPassword } from "../utils/hashPassword";

async function main() {
  const args = process.argv;

  if (args.length === 2) {
    console.error("Usage: npm run hash-password <password> ");
    process.exit(1);
  }

  const password = args[2];

  try {
    const hashed = await hashPassword(password, 10);
    console.log(hashed);
  } catch (err) {
    console.error("Error hashing password:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
