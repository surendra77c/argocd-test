import {Request, RestBindings, get, ResponseObject} from '@loopback/rest';
import {inject} from '@loopback/context';
import * as msutils from 'msutils';
/**
 * OpenAPI response for ping()
 */
const PING_RESPONSE: ResponseObject = {
  description: 'Ping Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        title: 'PingResponse',
        properties: {
          greeting: {type: 'string'},
          date: {type: 'string'},
          url: {type: 'string'},
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {type: 'string'},
            },
            additionalProperties: true,
          },
        },
      },
    },
  },
};

/**
 * A simple controller to bounce back http requests
 */
export class PingController {
  constructor(@inject(RestBindings.Http.REQUEST) private req: Request) {}

  // Map to `GET /ping`
  @get('/ping', {
    responses: {
      '200': PING_RESPONSE,
    },
  })
  async ping(): Promise<object> {
    // Reply with a greeting, the current time, the url, and request headers
    let isStoreConnect = false;
    let isRedisConnect = false;
    //check redis connection
    await msutils.getConfig(null, null);
    const redisKeys = await msutils.getRedisPingRes();
    if (redisKeys === 'PONG') {
      isRedisConnect = true;
    }
    const configStore = await msutils.fetchFromStore('ConfigStore', {
      msname: 'global',
    });
    if (configStore.length > 0) {
      isStoreConnect = true;
    }

    return {
      greeting: 'Hello from LoopBack',
      date: new Date(),
      url: this.req.url,
      headers: Object.assign({}, this.req.headers),
      isStoreConnect: isStoreConnect,
      isRedisConnect: isRedisConnect,
    };
  }
}
