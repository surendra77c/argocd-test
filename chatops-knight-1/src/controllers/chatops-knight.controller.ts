import {Locator} from './../models/account.model';
import {inject} from '@loopback/core';
import {post, get, param, requestBody, deprecated} from '@loopback/rest';
import {RestBindings, Response, Request} from '@loopback/rest';
import {ChatopsKnight} from '../services';

import {
  ChatopsKnightChannelCreateRequest,
  UpdateChatOpsIncidentEventRequest,
  ChatopsKnightTicketChannelCreateRequest,
  ReceiveChannelCreationEvent,
  ProcessCommandRequest,
  UpdateIncidentRequest,
  UpdateTicketRequest,
  AutoUpdateTicketRequest,
  GetOpenticketsForAccountRequest,
  GetOpenticketsForAccountRequestAsync,
  ResponseObject,
  AccountCodeLocator,
} from '../models';
import {UpdateTicketInChannelRequest} from '../models/updateTicketRequest.model';
import {getOpenTicketsForAccount} from '../utils/chatops-knight-utils';
import {BasicCallBackInfo} from '../models/basicCallBackInfo.model';
import {
  auttUpDateTicket,
  initiateProcess,
  processCommand,
  recievedChannelCreatedEvent,
  ticketInChannelCallbackEvent,
  updateTicketInEcoSystem,
  updateTicketProcess,
  processRegisterCustCommand,
  processuserInfoCommand,
  getAccountBoarded,
} from '../handler/chatops-knight-handler';
import {validateTransationID} from '../utils/chatops-knight-utils';
import * as msutils from 'msutils';
const updateMetricsFacts = 'updateMetricsFacts';

// import {constrainDataObject} from '@loopback/repository';

/**
 * @class ChatopsKnightController
 * @summary "This is the ChatOps orchestration Microservice"
 */
export class ChatopsKnightController {
  constructor(
    @inject('services.ChatopsKnight') protected chatopsknight: ChatopsKnight,
    @inject(RestBindings.Http.RESPONSE) protected response: Response,
    @inject(RestBindings.Http.REQUEST) protected request: Request,
  ) {}

  /**
   * @function updateChatOpsIncident
   * @summary "update incident details call to Incident Manager Microservice"
   * @param.header.string {CHATOPS-SOURCE-ID} contains external system source id
   * @param.header.string {CHATOPS-SOURCE-APITOKEN} contains external system source token for authentication
   * @param.header.string {transactionid} contains unique transaction id for tracing
   * @requestBody {UpdateChatOpsIncidentEventRequest} this object contains all required and optional params
   * @returns {*} HTTP 200 OK upon success with transaction id
   * @description this function is to update incident details in incident collaboration channel such as Slack, etc.,
   */
  @deprecated()
  @post('/updateChatOpsIncident', {
    summary: 'Update Channel with Incident Details',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async updateChatOpsIncident(
    @param.header.string('CHATOPS-SOURCE-ID', {
      required: true,
      description:
        'Source Identification Code,(uniquely Iidentifies the source system in chatops) ',
    })
    chatopsSourceId: string,
    @param.header.string('CHATOPS-SOURCE-APITOKEN', {
      required: true,
      description: 'Api Token (Signed Payload) or generated api key',
    })
    chatopsSourceAPIToken: string,
    @param.header.string('transactionid', {
      description:
        'String that uniquely identifies the transaction, can be obtained from event Payload',
    })
    transactionid: string,
    @param.header.string('X-Chatops-Key', {
      description:
        'String that uniquely identifies the Key used for Authentication',
    })
    keyName: string,
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to update Channel via Incident Manager',
      required: true,
    })
    updateEventRequest: UpdateChatOpsIncidentEventRequest,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    const isIncident = true;
    //updateEventRequest = msutils.replaceSplCharacters(updateEventRequest);
    //await msutils.getConfig();

    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/
    const tid = validateTransationID(this.response, transactionid);
    msutils.logInfo('updateChatOpsIncident', 1, tid);

    await updateTicketProcess(
      chatopsSourceId,
      chatopsSourceAPIToken,
      updateEventRequest,
      tid,
      isIncident,
      apiName,
      keyName,
      ProxySource,
    );
    return true;
  }

  @post('/updateTicketInEcosystem', {
    summary: 'Update Ticket in ChatOps Ecosystem',
    description:
      ' **Request Parameters:** \n\n **ticketId:** Identifies unique Ticket Id ( **Required** )\n\n **createIncidentChannel:** if set to true, creates a incident channel for onboarded/non-onboarded Accounts with assignments if any(**Optional**)\n\n **status:** Status of the ticket (**Optional**, supported values [ Hold| Inprogress | Discovery | Resolve | Close ]) \n\n **assignmentEmails**:List of email Ids to be added in the channel (**Optional**,supported values for roles [ROLE_DPE | ROLE_PRACTITIONER | ROLE_INC_COMMANDER | NONE] ) \n\n  **notificationEmails**:Email ids of those who gets notified in the Index Channel when updates happen (**Optional**) ',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async updateTicketInEcosystem(
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
    @param.header.string('proxy') ProxySource: string,
    @param.header.string('X-Routing-Req') autoRoutingReq: string,
    @param.header.string('X-Req-Routed-From') reqRoutedFrom: string,
    @requestBody({
      description: 'Request to update ticket in ChatOps Ecosystem',
      required: true,
    })
    updateTicketInChannelRequest: UpdateTicketInChannelRequest,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    validateTransationID(this.response, transactionid);
    // updateTicketInChannelRequest = msutils.replaceSplCharacters(
    //   updateTicketInChannelRequest,
    // );
    await updateTicketInEcoSystem(
      transactionid,
      updateTicketInChannelRequest,
      chatopsSourceId,
      chatopsSourceAPIToken,
      apiName,
      keyName,
      ProxySource,
      autoRoutingReq,
      reqRoutedFrom,
    );
    return true;
  }

  @deprecated()
  @post('/updateIncident', {
    summary: 'Update Channel with Incident Details',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async updateIncident(
    @param.header.string('CHATOPS-SOURCE-ID', {
      required: true,
      description:
        'Source Identification Code,(uniquely Iidentifies the source system in chatops) ',
    })
    chatopsSourceId: string,
    @param.header.string('CHATOPS-SOURCE-APITOKEN', {
      required: true,
      description: 'Api Token (Signed Payload) or generated api key',
    })
    chatopsSourceAPIToken: string,
    @param.header.string('transactionid', {
      description:
        'String that uniquely identifies the transaction, can be obtained from event Payload',
    })
    transactionid: string,
    @param.header.string('X-Chatops-Key', {
      description:
        'String that uniquely identifies the Key used for Authentication',
    })
    keyName: string,
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to update Channel via Incident Manager',
      required: true,
    })
    updateEventRequest: UpdateIncidentRequest,
  ): Promise<boolean> {
    const isIncident = true;
    const apiName = this.request.originalUrl.substring(1);
    //updateEventRequest = msutils.replaceSplCharacters(updateEventRequest);
    //await msutils.getConfig();
    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/

    updateEventRequest.isFetchDetailsRequired = false;
    const tid = validateTransationID(this.response, transactionid);
    msutils.logInfo('updateIncident', 1, tid);
    await updateTicketProcess(
      chatopsSourceId,
      chatopsSourceAPIToken,
      updateEventRequest,
      tid,
      isIncident,
      apiName,
      keyName,
      ProxySource,
    );
    return true;
  }

  /**
   * @function updateTicket
   * @summary "update ticket details call to Incident Manager Microservice"
   * @param.header.string {CHATOPS-SOURCE-ID} contains external system source id
   * @param.header.string {CHATOPS-SOURCE-APITOKEN} contains external system source token for authentication
   * @param.header.string {transactionid} contains unique transaction id for tracing
   * @requestBody {UpdateTicketRequest} this object contains all required and optional params
   * @returns {*} HTTP 200 OK upon success with transaction id
   * @description this function is to update Ticket details in Ticket collaboration channel such as Slack, etc.,
   */
  @post('/updateTicket', {
    summary: 'Update Channel with Ticket Details',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async updateTicket(
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
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to update Channel via Incident Manager',
      required: true,
    })
    updateTicketRequest: UpdateTicketRequest,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    //updateTicketRequest = msutils.replaceSplCharacters(updateTicketRequest);
    //await msutils.getConfig();
    /** start metrics invoked  **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/

    const isIncident = false;
    updateTicketRequest.isFetchDetailsRequired = false;
    const tid = validateTransationID(this.response, transactionid);
    msutils.logInfo('updateTicket', 1, tid);
    await updateTicketProcess(
      chatopsSourceId,
      chatopsSourceAPIToken,
      updateTicketRequest,
      tid,
      isIncident,
      apiName,
      keyName,
      ProxySource,
    );
    return true;
  }

  //internal call
  @post('/autoUpdateTicket', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async _autoUpdateTicket(
    @param.header.string('transactionid') transactionid: string,
    @param.header.string('CHATOPS-SOURCE-ID', {required: true})
    chatopsSourceId: string,
    @requestBody({
      description: 'Request to update ticket via internal framework',
      required: true,
    })
    updateTicketRequest: AutoUpdateTicketRequest,
  ): Promise<boolean> {
    validateTransationID(this.response, transactionid);
    //updateTicketRequest = msutils.replaceSplCharacters(updateTicketRequest);
    await auttUpDateTicket(transactionid, updateTicketRequest, chatopsSourceId);
    return true;
  }

  /**
   * @function initiateChatOpsIncidentProcess
   * @summary "initiate incident details call to Incident Manager Microservice"
   * @param.header.string {CHATOPS-SOURCE-ID} contains external system source id
   * @param.header.string {CHATOPS-SOURCE-APITOKEN} contains external system source token for authentication
   * @param.header.string {transactionid} contains unique transaction id for tracing
   * @requestBody {ChatopsKnightChannelCreateRequest} this object contains all required and optional params
   * @returns {*} HTTP 200 OK upon success with transaction id
   * @description this function is to create incident channel in collaboration application such as Slack, etc.,
   */
  @deprecated()
  @post('/initiateChatOpsIncidentProcess', {
    summary: 'Create Channel with Incident Details',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async initiateChatOpsIncidentProcess(
    @param.header.string('CHATOPS-SOURCE-ID', {
      required: true,
      description:
        'Source Identification Code,(uniquely Iidentifies the source system in chatops) ',
    })
    chatopsSourceId: string,
    @param.header.string('CHATOPS-SOURCE-APITOKEN', {
      required: true,
      description: 'Api Token (Signed Payload) or generated api key',
    })
    chatopsSourceAPIToken: string,
    @param.header.string('transactionid', {
      description:
        'String that uniquely identifies the transaction, can be obtained from event Payload',
    })
    transactionid: string,
    @param.header.string('X-Chatops-Key', {
      description:
        'String that uniquely identifies the Key used for Authentication',
    })
    keyName: string,
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to create Channel via Incident Manager',
      required: true,
    })
    crtRequest: ChatopsKnightChannelCreateRequest,
  ): Promise<ResponseObject> {
    const apiName = this.request.originalUrl.substring(1);
    //crtRequest = msutils.replaceSplCharacters(crtRequest);
    //await msutils.getConfig();
    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/

    const isIncident = true;
    const tid = validateTransationID(this.response, transactionid);
    msutils.logInfo('initiateChatOpsIncidentProcess', 1, tid);
    const response = await initiateProcess(
      chatopsSourceId,
      chatopsSourceAPIToken,
      crtRequest,
      tid,
      isIncident,
      apiName,
      keyName,
      true,
      ProxySource,
    );
    return response;
  }

  /**
   * @function initiateTicket
   * @summary "initiate ticket details call to Incident Manager Microservice"
   * @param.header.string {CHATOPS-SOURCE-ID} contains external system source id
   * @param.header.string {CHATOPS-SOURCE-APITOKEN} contains external system source token for authentication
   * @param.header.string {transactionid} contains unique transaction id for tracing
   * @requestBody {ChatopsKnightChannelCreateRequest} this object contains all required and optional params
   * @returns {*} HTTP 200 OK upon success with transaction id
   * @description this function is to create Ticket channel in collaboration application such as Slack, etc.,
   */
  @post('/initiateTicket', {
    summary: 'Create Channel with Ticket Details',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async initiateTicket(
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
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to create Channel via Incident Manager',
      required: true,
    })
    crtRequest: ChatopsKnightTicketChannelCreateRequest,
  ): Promise<ResponseObject> {
    const apiName = this.request.originalUrl.substring(1);
    //crtRequest = msutils.replaceSplCharacters(crtRequest);
    //await msutils.getConfig();
    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });
    /** end metrics invoked **/

    const tid = validateTransationID(this.response, transactionid);
    msutils.logInfo('initiateTicket', 1, tid);
    const isIncident = false;
    const response = await initiateProcess(
      chatopsSourceId,
      chatopsSourceAPIToken,
      crtRequest,
      tid,
      isIncident,
      apiName,
      keyName,
      true,
      ProxySource,
    );
    return response;
  }

  /**
   * @function initiateChatOpsIncidentProcess
   * @summary "initiate incident details call to Incident Manager Microservice"
   * @param.header.string {CHATOPS-SOURCE-ID} contains external system source id
   * @param.header.string {CHATOPS-SOURCE-APITOKEN} contains external system source token for authentication
   * @param.header.string {transactionid} contains unique transaction id for tracing
   * @requestBody {ChatopsKnightChannelCreateRequest} this object contains all required and optional params
   * @returns {*} HTTP 200 OK upon success with transaction id
   * @description this function is to create incident channel in collaboration application such as Slack, etc.,
   */
  @post('/processCommand', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async processCommand(
    @param.header.string('transactionid', {required: true})
    transactionid: string,
    @requestBody({
      description: 'Request to create channel for Slack command given by User',
      required: true,
    })
    processCommandRequest: ProcessCommandRequest,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    validateTransationID(this.response, transactionid);
    let text = '';
    if (Object.keys(processCommandRequest?.msgRequest).length) {
      text =
        processCommandRequest?.msgRequest['text'] ||
        processCommandRequest?.msgRequest['event'].text;
    }
    if (text !== '' && text.toLowerCase().includes('register_customer')) {
      await processRegisterCustCommand(
        transactionid,
        processCommandRequest,
        apiName,
      );
    } else if (text !== '' && text.toLowerCase().includes('userinfo')) {
      await processuserInfoCommand(
        transactionid,
        processCommandRequest,
        apiName,
      );
    } else await processCommand(transactionid, processCommandRequest, apiName);
    return true;
  }

  /**
   * @function receiveChannelCreationEvent
   * @summary "receive incident channel details from Incident Manager Microservice"
   * @param.header.string {transactionid} contains unique transaction id for tracing
   * @requestBody {ReceiveChannelCreationEvent} this object contains all required and optional params
   * @returns {*} HTTP 200 OK upon success with transaction id
   * @description this function is to receive incident channel details, which gets created in collaboration application such as Slack, etc.,
   *              this does post processing, such as:
   *              sending channel details back to external system
   *              trigger updating channel details in ITSM
   *              trigger dynamic resource assignments into incident channel
   *              trigger getting resource details from components like GNM/PagerDuty using group names
   */
  @post('/receiveChannelCreationEvent', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async receiveChannelCreationEvent(
    @param.header.string('transactionid') transactionid: string,
    @requestBody({
      description:
        'Receive created ticket channel info back from Incident Manager',
      required: true,
    })
    rvcChnlCreateEvent: ReceiveChannelCreationEvent,
  ): Promise<boolean> {
    validateTransationID(this.response, transactionid);
    await recievedChannelCreatedEvent(transactionid, rvcChnlCreateEvent);
    return true;
  }

  @post('/ticketInChannelCallbackEvent', {
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async ticketInChannelCallbackEvent(
    @param.header.string('transactionid') transactionid: string,
    @requestBody({
      description:
        'Receive status of update ticket in channel for external source from Incident Manager',
      required: true,
    })
    callbackReq: BasicCallBackInfo,
  ): Promise<boolean> {
    await ticketInChannelCallbackEvent(transactionid, callbackReq);
    validateTransationID(this.response, transactionid);
    return true;
  }

  @post('/getOpenTickets/sync', {
    summary:
      'Get Open Tickets for an Account filtered by type(Ticket Priority(number) and isMajor(boolean))',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async getOpenTicketsSync(
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
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to get open tickets via Incident Manager',
      required: true,
    })
    getOpenTicketsRequest: GetOpenticketsForAccountRequest,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    const isSync = true;
    const res = await getOpenTicketsForAccount(
      chatopsSourceId,
      chatopsSourceAPIToken,
      getOpenTicketsRequest,
      transactionid,
      apiName,
      keyName,
      isSync,
      ProxySource,
    );
    return res;
  }

  @post('/getOpenTickets', {
    summary:
      'Get Open Tickets for an Account filtered by type(Ticket Priority(number) and isMajor(boolean))',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async getOpenTickets(
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
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Request to get open tickets via Incident Manager',
      required: true,
    })
    getOpenTicketsRequest: GetOpenticketsForAccountRequestAsync,
  ): Promise<boolean> {
    const apiName = this.request.originalUrl.substring(1);
    const isSync = false;
    await getOpenTicketsForAccount(
      chatopsSourceId,
      chatopsSourceAPIToken,
      getOpenTicketsRequest,
      transactionid,
      apiName,
      keyName,
      isSync,
      ProxySource,
    );
    return true;
  }

  @post('/account', {
    summary: 'Get Account On Boarded',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async getAccountBoardedPost(
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
    @param.header.string('proxy') ProxySource: string,
    @requestBody({
      description: 'Accountcode locator',
      required: true,
    })
    locator: Locator,
  ): Promise<Object> {
    const apiName = this.request.originalUrl.substring(1);
    const config = await msutils.getConfig('', chatopsSourceId);
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });

    const response = await getAccountBoarded(
      locator.accountCodeLocator,
      apiName,
      keyName,
      transactionid,
      chatopsSourceId,
      chatopsSourceAPIToken,
      config,
    );
    return response;
  }

  @get('/account/{searchKey}/{searchValue}', {
    summary: 'Get Account On Boarded',
    responses: {
      '200': {
        header: {
          transactionid: {type: 'string'},
        },
      },
    },
  })
  async getAccounts(
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
    @param.header.string('proxy') ProxySource: string,
    @param.path.string('searchKey') searchKey: string,
    @param.path.string('searchValue') searchValue: string,
  ): Promise<Object> {
    const locators: AccountCodeLocator[] = [];
    locators.push({SearchKey: searchKey, SearchValue: searchValue});
    const apiName = this.request.originalUrl.substring(1);
    const accountCfg = await msutils.getAccountByLocator(locators);
    const config = await msutils.getConfig(
      accountCfg.accountCode,
      chatopsSourceId,
    );
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'invoked',
    });

    const response = await getAccountBoarded(
      locators,
      apiName,
      keyName,
      transactionid,
      chatopsSourceId,
      chatopsSourceAPIToken,
      config,
    );
    return response;
  }
}
