import { z } from 'zod';

const configSchema = z.object({
  DISCORD_APP_ID: z.string(),
  DISCORD_PUBLIC_KEY: z.string(),
  DISCORD_TOKEN: z.string(),
  CHALLONGE_API_KEY: z.string(),
});

export default configSchema.parse(process.env);
