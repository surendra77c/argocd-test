import constants from 'constants';
import fs from 'fs';
import {
  ChatopsKnightServiceApplication,
  ApplicationConfig,
} from './application';
export * from './application';
export {ChatopsKnightServiceApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new ChatopsKnightServiceApplication(options);
  await app.boot();
  await app.start();
  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);
  return app;
}

if (require.main === module) {
  // Run the application
  const config = {
    rest: {
      protocol: 'https',
      port: +(process.env.PORT ?? 3000),
      key: fs.readFileSync(`./ssl/${process.env.NODE_ENV}/privatekey.pem`),
      cert: fs.readFileSync(`./ssl/${process.env.NODE_ENV}/certificate.pem`),
      secureOptions:
        constants.SSL_OP_NO_SSLv2 |
        constants.SSL_OP_NO_SSLv3 |
        constants.SSL_OP_NO_TLSv1 |
        constants.SSL_OP_NO_TLSv1_1,
      apiExplorer: {
        disabled: process.env.NODE_ENV === 'production',
      },
      // The `gracePeriodForClose` provides a graceful close for http/https
      // servers with keep-alive clients. The default value is `Infinity`
      // (don't force-close). If you want to immediately destroy all sockets
      // upon stop, set its value to `0`.
      // See https://www.npmjs.com/package/stoppable
      gracePeriodForClose: 5000, // 5 seconds
      openApiSpec: {
        // useful when used with OpenAPI-to-GraphQL to locate your application
        setServersFromRequest: true,
      },
    },
  };
  main(config).catch((err) => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
