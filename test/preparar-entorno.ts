import { config } from 'dotenv';

// Las pruebas e2e usan la base trazalia_test. En CI las variables llegan del workflow
// y .env.test no existe; dotenv no sobrescribe variables ya definidas.
config({ path: '.env.test', quiet: true });
