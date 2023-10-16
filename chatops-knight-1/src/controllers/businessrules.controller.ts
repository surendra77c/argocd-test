import {inject} from '@loopback/core';
import {post, param, requestBody} from '@loopback/rest';
import {RestBindings, Response, Request} from '@loopback/rest';
import * as HttpErrors from 'http-errors';
import * as logger from 'winston';
import * as msutils from 'msutils';
import {ChatopsKnight} from '../services';
import {DirectIntegrationRequest} from '../models/businessrule.model';
// import {validateAndGetConfig} from '../utils/passthrough.utils';
import {directIntegrationHandler} from '../utils/businessrule.utils';

const DirectIntegrationQueue = 'DirectIntegrationQueue';
const DirectIntegrationQueueType = 'DirectIntegrationQueueType';

/**
 * @class passThroughController
 * @summary "This is the Abstract passthrough service for providing interface to ticketing tool as well as collab api's exposed by chatops"
 */
export class BusinessruleController {
  constructor(
    @inject('services.ChatopsKnight') protected chatopsknight: ChatopsKnight,
    @inject(RestBindings.Http.RESPONSE) protected response: Response,
    @inject(RestBindings.Http.REQUEST) protected request: Request,
  ) {}

  @post('/directIntegrationAction', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async directIntegrationAction(
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
      description: 'Payload from Business Rule of ticketing tool',
      required: true,
    })
    businessruleRequest: DirectIntegrationRequest,
  ): Promise<Object> {
    const apiName = this.request.originalUrl.substring(1);
    logger.debug(
      `directIntegration : businessruleRequest:${JSON.stringify(
        businessruleRequest,
      )} chatopsSourceId:${chatopsSourceId}`,
    );
    const config = await msutils.getConfig(
      businessruleRequest?.accountCode,
      chatopsSourceId,
    );
    registerHandler();
    if (!transactionid) {
      throw new HttpErrors.BadRequest(
        `transactionid in the request header must be defined and should have value.`,
      );
    }
    this.response.setHeader('transactionid', transactionid);
    msutils.logInfo('directIntegration', 1, transactionid);

    // const accountCfg = config.account;
    const accountCfg =
      Object.keys(config.account).length > 0 ? config.account : undefined;
    if (!accountCfg) {
      throw new HttpErrors.BadRequest(
        `Account ${businessruleRequest.accountCode} is not onboarded`,
      );
    }
    if (!accountCfg?.businessRulesData?.chatopsDrivenIntegration) {
      throw new HttpErrors.BadRequest(
        `Account is not enabled to process business rule request.`,
      );
    }
    let sourceCfg;

    //TODO: header auth validation for calls from external systems like CDI
    //TODO: external systems like CDI retry could send duplicate events and such duplicates suppression to be handled
    const sourceidentificationcode = chatopsSourceId;
    const sourceAPIToken = chatopsSourceAPIToken;
    logger.info(
      `Executing updateTicketProcess for source id : ${chatopsSourceId}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateTicketProcess',
      },
    );
    const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
    if (accountActiveStatus?.gracefullExit) {
      return true;
    }
    if (sourceidentificationcode && sourceidentificationcode.trim() !== '') {
      // sourceCfg = config.sourceSystem;
      sourceCfg =
        Object.keys(config.sourceSystem).length > 0
          ? config.sourceSystem
          : undefined;
      if (sourceCfg) {
        if (sourceAPIToken || sourceAPIToken.trim() !== '') {
          const actualPayload = {
            'X-Chatops-Source-Id': sourceidentificationcode,
            ticketId: businessruleRequest.ticketId,
          };
          try {
            if (
              !(await msutils.validatePayload(
                sourceAPIToken,
                actualPayload,
                chatopsSourceId,
                apiName,
                accountCfg.accountCode,
                keyName,
              ))
            ) {
              logger.error(
                `Bad API Token for system -> ${sourceidentificationcode}`,
                {
                  transactionid: `${transactionid}`,
                  class: 'ChatopsKnightController',
                  function: 'updateTicketProcess',
                },
              );
              throw new HttpErrors.Unauthorized(
                `Bad API Token for system -> ${sourceidentificationcode}`,
              );
            }
          } catch (e) {
            logger.error(`Bad API Token for system -> [${e}]`, {
              transactionid: `${transactionid}`,
              class: 'ChatopsKnightController',
              function: 'updateTicketProcess',
            });
            throw new HttpErrors.Unauthorized(
              `Bad API Token for system -> ${sourceidentificationcode}`,
            );
          }
        }
      } else {
        logger.error(`System unregistered -> ${sourceidentificationcode}`, {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'updateTicketProcess',
        });
        throw new HttpErrors.Unauthorized(
          `System unregistered -> ${sourceidentificationcode}`,
        );
      }
    } else {
      logger.error(
        `Unauthorized request without ChatOps Source ID & API Key/Token`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'updateTicketProcess',
        },
      );
      throw new HttpErrors.Unauthorized(
        `Unauthorized request without ChatOps Source ID & API Key/Token`,
      );
    }
    msutils.logInfo(
      `${businessruleRequest.ticketId}:${accountCfg?.accountCode}:directIntegration`,
      2,
      transactionid,
    );
    const data = {
      accountCfg: accountCfg,
      transactionid: transactionid,
      getTicketDetailsRequest: businessruleRequest,
      chatopsSourceId: chatopsSourceId,
      chatopsSourceAPIToken: chatopsSourceAPIToken,
      apiName: apiName,
      keyName: keyName,
      ProxySource: ProxySource,
      config: config,
    };
    msutils.queueJobByJobType(
      DirectIntegrationQueue,
      DirectIntegrationQueueType,
      data,
      config.JobQueue.Options,
    );
    return true;
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
        DirectIntegrationQueue,
        DirectIntegrationQueueType,
        directIntegrationHandler,
      );

      isHandlerRegistered = true;
    } catch (e) {
      isHandlerRegistered = false;
    }
  }
}
