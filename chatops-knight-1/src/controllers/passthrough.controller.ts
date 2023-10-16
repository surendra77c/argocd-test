import {inject} from '@loopback/core';
import {post, param, requestBody} from '@loopback/rest';
import {RestBindings, Response, Request} from '@loopback/rest';
import * as HttpErrors from 'http-errors';
import * as logger from 'winston';
import * as msutils from 'msutils';
import {v4 as uuidv4} from 'uuid';
import {ChatopsKnight} from '../services';
import {PassThroughRequest} from '../models/passthrough.model';
import {PassThroughSyncRequest} from '../models/passthroughsync.model';
import {
  PassThroughRequestProcess,
  reStructurePassThroughReq,
  validateAndGetConfig,
} from '../utils/passthrough.utils';

const passThroughQueue = 'passThroughQueue';
const passThroughType = 'passThroughType';

/**
 * @class passThroughController
 * @summary "This is the Abstract passthrough service for providing interface to ticketing tool as well as collab api's exposed by chatops"
 */
export class PassthroughController {
  constructor(
    @inject('services.ChatopsKnight') protected chatopsknight: ChatopsKnight,
    @inject(RestBindings.Http.RESPONSE) protected response: Response,
    @inject(RestBindings.Http.REQUEST) protected request: Request,
  ) {}

  @post('/passThrough', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async passThrough(
    // @param.header.string('transactionid') transactionid: string,
    @param.header.string('X-Chatops-Source-Id', {
      required: true,
      description:
        'Source Identification Code,(uniquely Iidentifies the source system in chatops) ',
    })
    chatopsSourceId: string,
    @param.header.string('X-Chatops-Source-Api-Token', {
      required: true,
      description: 'Api Token (Signed Payload) or generated api key',
    })
    chatopsSourceAPIToken: string,
    @param.header.string('X-Transaction-Id', {
      description:
        'String that uniquely identifies the transaction, can be obtained from event Payload',
    })
    transactionid: string,
    @param.header.string('X-Chatops-Key', {
      description:
        'String that uniquely identifies the Key used for Authentication',
    })
    keyName: string,
    @param.header.string('proxy')
    ProxySource: string,
    @requestBody({
      description: 'Payload for exploiting chatops pass through API',
      required: true,
    })
    passThroughAction: PassThroughRequest,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    const config = await msutils.getConfig(null, null);
    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'passThrough',
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/

    this.response.setHeader('transactionid', transactionid);
    registerHandler();
    logger.info('passThrough: Invoked', {
      transactionid: `${transactionid}`,
      class: 'passThroughController',
      function: 'passThrough',
    });
    const authData = {
      chatopsSourceId: chatopsSourceId,
      chatopsSourceAPIToken: chatopsSourceAPIToken,
      apiName: apiName,
      keyName: keyName,
    };
    let accountCfg;
    const accountCodeLocators = passThroughAction?.accountCodeLocators;
    if (accountCodeLocators) {
      accountCfg = await msutils.getAccountByLocator(accountCodeLocators);
      if (!accountCfg) {
        throw new HttpErrors.BadRequest(
          `Account ${accountCodeLocators} is not onboarded`,
        );
      }
    }
    const configData = {
      transactionid: transactionid,
    };
    await validateAndGetConfig(authData, configData, accountCfg);
    /** start metrics invoked **/
    const metrics = {
      accountCode: accountCfg?.accountCode,
      api: 'passThrough',
      sourceSystem: chatopsSourceId,
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'validated',
    };

    msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
    /** end metrics invoked **/

    await (
      await msutils
    ).queueJobByJobType(
      passThroughQueue,
      passThroughType,
      {
        passThroughAction: passThroughAction,
        authData: authData,
        transactionid: transactionid,
        metrics: metrics,
        accountCfg: accountCfg,
      },
      config.JobQueue.Options,
    );
    return true;
  }

  @post('/passThrough/sync', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async passThroughSync(
    // @param.header.string('transactionid') transactionid: string,
    @param.header.string('X-Chatops-Source-Id', {
      // required: true,
      description:
        'Source Identification Code,(uniquely Iidentifies the source system in chatops) ',
    })
    chatopsSourceId: string,
    @param.header.string('X-Chatops-Source-Api-Token', {
      // required: true,
      description: 'Api Token (Signed Payload) or generated api key',
    })
    chatopsSourceAPIToken: string,
    @param.header.string('X-Chatops-Key', {
      description:
        'String that uniquely identifies the Key used for Authentication',
    })
    keyName: string,
    @param.header.string('proxy')
    ProxySource: string,
    @param.header.string('Authorization', {
      description:
        'String that uniquely identifies the Key used for Authentication',
    })
    auth: string,
    @requestBody({
      description: 'Payload for exploiting chatops pass through API',
      required: true,
    })
    passThroughAction: PassThroughSyncRequest,
  ): Promise<object> {
    const transactionid = uuidv4();
    const apiName = this.request.originalUrl.substring(1);
    if (auth) {
      const authParams = await msutils.basicAuthParser(auth);
      chatopsSourceAPIToken = authParams?.password;
      chatopsSourceId = authParams?.user;
      logger.info('Request Decoded for Basic Auth');
    }
    if (!chatopsSourceAPIToken || !chatopsSourceId) {
      throw new HttpErrors[401](`No Auth Provided`);
    }
    await msutils.validatePayload(
      chatopsSourceAPIToken,
      {},
      chatopsSourceId,
      apiName,
      '',
      keyName,
      '',
    );
    if (!passThroughAction?.isSync) {
      passThroughAction.isSync = true;
    }
    // const config = await msutils.getConfig(null, null);
    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'passThroughSync',
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/

    this.response.setHeader('transactionid', transactionid);
    registerHandler();
    logger.info('passThrough/sync: Invoked', {
      transactionid: `${transactionid}`,
      class: 'passThroughController',
      function: 'passThroughSync',
    });
    const authData = {
      chatopsSourceId: chatopsSourceId,
      chatopsSourceAPIToken: chatopsSourceAPIToken,
      apiName: apiName,
      keyName: keyName,
    };
    let accountCfg;
    if (passThroughAction?.accountCode) {
      accountCfg = await msutils.getAccountByCode(
        passThroughAction?.accountCode,
      );
      if (!accountCfg) {
        throw new HttpErrors.BadRequest(
          `Account ${passThroughAction?.accountCode} is not onboarded`,
        );
      }
    }
    const configData = {
      transactionid: transactionid,
    };
    await validateAndGetConfig(authData, configData, accountCfg);
    /** start metrics invoked **/
    const metrics = {
      accountCode: accountCfg?.accountCode,
      api: 'passThrough/sync',
      sourceSystem: chatopsSourceId,
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'validated',
    };

    msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
    const actionReq = reStructurePassThroughReq(passThroughAction);
    /** end metrics invoked **/
    const jobData = {
      data: {
        passThroughAction: actionReq,
        authData: authData,
        transactionid: transactionid,
        metrics: metrics,
        accountCfg: accountCfg,
      },
    };
    const res = await PassThroughRequestProcess(jobData);
    return res;
  }
}

let isHandlerRegistered = false;

/**
 * @function registerHandler
 * @summary "helper method for registration of job queues with associated handler functions"
 * @param None
 */
function registerHandler() {
  if (!isHandlerRegistered) {
    try {
      msutils.registerJobHandlerByJobType(
        passThroughQueue,
        passThroughType,
        PassThroughRequestProcess,
      );

      isHandlerRegistered = true;
    } catch (e) {
      isHandlerRegistered = false;
    }
  }
}
