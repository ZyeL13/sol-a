/* eslint-disable no-console */
import { env } from '../src/config/config';
import { migrate } from '../src/db/migrate';

migrate(env.DATABASE_URL)
  .then((applied) => {
    console.log(applied.length === 0 ? 'No new migrations.' : `Applied: ${applied.join(', ')}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
