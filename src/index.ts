import { App } from './app';
import { logger } from './common/logger';

async function main(): Promise<void> {
  const app = new App();
  await app.start();
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start sol-a');
  process.exit(1);
});
