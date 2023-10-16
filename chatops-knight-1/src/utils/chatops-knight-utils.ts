import * as HttpErrors from 'http-errors';
import * as logger from 'winston';
import * as msutils from 'msutils';
import {v4 as uuidv4} from 'uuid';
import {
  updateITSMWithChannelInfoEventHandler,
  fetchTicketDetailHandler,
  updateChannelCreatedResponseHandler,
  assignmentEventHandler,
  createChannelHandler,
  receiveChannelCreationEventHandler,
  updateTicketInChannelHandler,
  callbackEventHandler,
  updateChatOpsIncidentEventHandler,
  fetchOpenTicketsHandler,
  registerCustomerHandler,
  assignmentServiceEventHandler,
  assignmentPagerDutyEventHandler,
  assignmentGnmEventHandler,
} from '../handler/chatops-knight-queue-handler';
import {getUserData, getUserDataEventType} from './userMappingUtils';

export const CKCreateIncQueue = 'CKCreateIncQueue';
export const CKUpdateTicketInEcosystem = 'CKUpdateTicketInEcosystem';
export const createChannelType = 'createChannelType';
export const receiveChannelCreationType = 'receiveChannelCreationType';
export const callBackEventType = 'callBackEventType';
export const updateChatOpsIncidentEventType = 'updateChatOpsIncidentEventType';
export const updateTicketProcessType = 'updateTicketProcessType';
export const updateTicketType = 'updateTicketType';
export const ecoSystemType = 'ecoSystemType';
export const updateITSMWithChannelInfoType = 'updateITSMWithChannelInfoType';
export const fetchTicketDetailType = 'fetchTicketDetailType';
export const ownerAssignmentType = 'ownerAssignmentType';
export const assignmentServiceType = 'assignmentServiceType';
export const updateChannelCreatedResponseType =
  'updateChannelCreatedResponseType';
export const updateTeamsChannelCreateMsgType =
  'updateTeamsChannelCreateMsgType';
export const registerCustomerEventType = 'registerCustomerEventType';
export const regexForANWithColHypUnder = /^[a-zA-Z0-9:_\-]*$/;
export const fetchOpenTicketType = 'fetchOpenTicketType';
export const assignmentPagerDutyType = 'assignmentPagerDutyType';
export const assignmentGnmType = 'assignmentGnmType';
let isHandlerRegistered = false;
//const validEnvironments = ['DEV', 'SIT', 'QA', 'UAT', 'PROD'];
const validTicketImpacts = ['HIGH', 'MEDIUM', 'LOW', 'MAJOR', 'MINOR', 'NONE'];
const regexForAlphaNumeric = /^[a-zA-Z0-9]*$/;
const regexForANWithUnder = /^[a-zA-Z0-9_\-]*$/;

const regexForANWithAmpDotHypUnder = /^[a-zA-Z0-9&._\-]*$/;
const regexForANWithSpaceAmpDotHypUnder = /^[a-zA-Z0-9&._\- ]*$/;
const regexForANWithAtDotColon = /^[a-zA-Z0-9.:@]*$/;
const regexForANWithAtDotColonUnder = /^[a-zA-Z0-9.:@_]*$/;
const regexForANWithHyp = /^[a-zA-Z0-9\-]*$/;
const regexForURL =
  /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*(\.[a-z]{2,5})?(:[0-9]{1,5})?(\/.*)?$/;
const rateLimit = {
  max: 5,
  duration: 5000,
};
export async function validateAccount(
  updateTicketInChannelRequest,
  transactionid,
) {
  logger.info('Validating account locator  from incoming request');
  let accountCfg;
  try {
    accountCfg = await msutils.getAccountByLocator(
      updateTicketInChannelRequest?.accountCodeLocators,
    );
    if (accountCfg) {
      logger.info(`Account is onboarded in ChatOps !! `, {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateTicketInEcosystem',
      });
    }
  } catch (e) {
    logger.warn(
      `Account with searchLocator : ${JSON.stringify(
        updateTicketInChannelRequest.accountCodeLocators,
      )} is not onboarded in system `,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateTicketInEcosystem',
      },
    );
  }
  return accountCfg;
}

/**
 * @function validateInputParamatersForReceiveChannelCreationEvent
 * @summary "helper method for receiveChannelCreationEvent for input validation"
 * @param {request} contains all required and optional params
 */
export function validateInputParamatersForReceiveChannelCreationEvent(
  ckChannelCreationEvent,
) {
  /*logger.info(
    `Validate Input Parameters for Recieve Channel Creation [${JSON.stringify(
      ckChannelCreationEvent,
      null,
      2,
    )}]`,
    {
      transactionid: `${ckChannelCreationEvent.transactionid}`,
      class: 'ChatopsKnightController',
      function: 'validateInputParamatersForReceiveChannelCreationEvent',
    },
  );*/
  if (!ckChannelCreationEvent.accountCodeLocators) {
    logger.error(
      `Following input parameter is mandatory with valid value -> accountCodeLocators`,
      {
        transactionid: `${ckChannelCreationEvent.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamatersForReceiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> accountCodeLocators`,
    );
  } else {
    for (const accountCodeLocators of ckChannelCreationEvent.accountCodeLocators) {
      const searchKey = accountCodeLocators.SearchKey;
      const searchValue = accountCodeLocators.SearchValue;
      if (!searchKey || !searchKey.match(regexForAlphaNumeric)) {
        logger.error(
          `One or more following input parameters are mandatory with valid value -> SearchKey`,
          {
            transactionid: `${ckChannelCreationEvent.transactionid}`,
            class: 'ChatopsKnightController',
            function: 'validateInputParamatersForReceiveChannelCreationEvent',
          },
        );
        throw new HttpErrors.BadRequest(
          `One or more following input parameters are mandatory with valid value -> SearchKey`,
        );
      }
      if (
        !searchValue ||
        !searchValue.trim().match(regexForANWithAmpDotHypUnder)
      ) {
        logger.error(
          `One or more following input parameters are mandatory with valid value -> SearchValue`,
          {
            transactionid: `${ckChannelCreationEvent.transactionid}`,
            class: 'ChatopsKnightController',
            function: 'validateInputParamatersForReceiveChannelCreationEvent',
          },
        );
        throw new HttpErrors.BadRequest(
          `One or more following input parameters are mandatory with valid value -> SearchValue`,
        );
      }
    }
  }

  if (
    !ckChannelCreationEvent.accountcode ||
    !ckChannelCreationEvent.accountcode.match(regexForANWithUnder)
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> accountcode`,
      {
        transactionid: `${ckChannelCreationEvent.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamatersForReceiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> accountcode`,
    );
  }

  if (
    !ckChannelCreationEvent.ticketid ||
    !ckChannelCreationEvent.ticketid.match(regexForANWithUnder)
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> ticketid`,
      {
        transactionid: `${ckChannelCreationEvent.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamatersForReceiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> ticketid`,
    );
  }

  // eventID is optional hence commented below.
  // TODO: Needs to be removed if no affect in any other functionalities.
  // if (
  //   !ckChannelCreationEvent.eventid ||
  //   !ckChannelCreationEvent.eventid.match(regexForANWithColHypUnder)
  // ) {
  //   logger.error(
  //     `Following input parameter must have a valid value -> eventid`,
  //     {
  //       transactionid: `${ckChannelCreationEvent.transactionid}`,
  //       class: 'ChatopsKnightController',
  //       function: 'validateInputParamatersForReceiveChannelCreationEvent',
  //     },
  //   );
  //   throw new HttpErrors.BadRequest(
  //     `Following input parameter must have a valid value -> eventid`,
  //   );
  // }
  if (
    !ckChannelCreationEvent.channelid ||
    //!ckChannelCreationEvent.channelid.match(regexForANWithAtDotColon)
    !ckChannelCreationEvent.channelid.match(regexForANWithAtDotColonUnder)
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> channelid`,
      {
        transactionid: `${ckChannelCreationEvent.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamatersForReceiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> channelid`,
    );
  }

  if (
    !ckChannelCreationEvent.channelname ||
    !ckChannelCreationEvent.channelname.match(regexForANWithColHypUnder)
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> channelname`,
      {
        transactionid: `${ckChannelCreationEvent.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamatersForReceiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> channelname`,
    );
  }

  if (
    !ckChannelCreationEvent.channelurl ||
    !ckChannelCreationEvent.channelurl.match(regexForURL)
  ) {
    if (ckChannelCreationEvent.collabTool.toUpperCase() !== 'TEAMS') {
      logger.error(
        `Following input parameter is mandatory with valid value -> channelurl`,
        {
          transactionid: `${ckChannelCreationEvent.transactionid}`,
          class: 'ChatopsKnightController',
          function: 'validateInputParamatersForReceiveChannelCreationEvent',
        },
      );
      throw new HttpErrors.BadRequest(
        `Following input parameter is mandatory with valid value -> channelurl`,
      );
    }
  }

  if (
    !ckChannelCreationEvent.workspaceid ||
    !ckChannelCreationEvent.workspaceid.match(regexForANWithHyp)
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> workspaceid`,
      {
        transactionid: `${ckChannelCreationEvent.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamatersForReceiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> workspaceid`,
    );
  }
  // if (
  //   !(typeof ckChannelCreationEvent.externalcallbackaddress === 'undefined') &&
  //   !ckChannelCreationEvent.externalcallbackaddress.match(regexForURL)
  // ) {
  //   throw new HttpErrors.BadRequest(
  //     `Following input parameter must have a valid value -> externalcallbackaddress`,
  //   );
  // }

  // if (
  //   typeof ckChannelCreationEvent.sourceidentificationcode === 'undefined' ||
  //   ckChannelCreationEvent.sourceidentificationcode === '' ||
  //   !ckChannelCreationEvent.sourceidentificationcode.match(regexForAlphaNumeric)
  // ) {
  //   throw new HttpErrors.BadRequest(
  //     `Following input parameter is mandatory with valid value -> sourceidentificationcode`,
  //   );
  // }
}

async function updateTeamsChannelCreateMsgHandler(job) {
  const {transactionid, channelCreateRequest, data} = job.data;
  const logObj = {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'updateTeamsChannelCreateMsgHandler',
  };
  try {
    logger.info(
      'BEGIN -> updating create incident msg with join collaboration button',
      logObj,
    );
    const collabUrl = await msutils.getMsUrl('chatopsCollab');
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'Container',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `Channel *${data.channelname}* created`,
                      weight: 'Bolder',
                      wrap: true,
                    },
                  ],
                  width: 'stretch',
                },
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'ActionSet',
                      horizontalAlignment: 'Left',
                      spacing: 'Medium',
                      actions: [
                        {
                          type: 'Action.Submit',
                          title: 'Join Collaboration',
                          data: {
                            id: 'joinCollaboration',
                            callbackid: data.callbackid,
                          },
                        },
                      ],
                    },
                  ],
                  width: 'auto',
                },
              ],
            },
          ],
        },
      ],
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
    };
    card['token'] = '';
    card['channel'] = channelCreateRequest.channelId;
    const body = {
      ts: channelCreateRequest.replyToId,
      channelid: channelCreateRequest.channelId,
      collabPlatform: 'TEAMS',
      workspaceName: channelCreateRequest.workspaceName,
      message: card,
      isUpdate: true,
    };
    const restRequest = new msutils.DynamicRestCall(
      `${collabUrl}/sendMessage`,
      body,
      'POST',
      {transactionid},
    );
    // getting data from collab MS.
    const restResponse = await restRequest.call();
    const parsedResponse = restRequest.parseResponse(restResponse);
    logger.info(
      `collab response -> ${JSON.stringify(parsedResponse, null, 2)}`,
      logObj,
    );
    logger.info(
      'End -> updating create incident msg with join collaboration button',
      logObj,
    );
  } catch (err) {
    logger.error(
      `error occureed while updating create incident msg with join collaboration button -- ${err}`,
      logObj,
    );
    throw err;
  }
}

/**
 * @function registerHandler
 * @summary "helper method for registration of job queues with associated handler functions"
 * @param None
 */
export function registerHandler() {
  if (!isHandlerRegistered) {
    try {
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        updateITSMWithChannelInfoType,
        updateITSMWithChannelInfoEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        fetchTicketDetailType,
        fetchTicketDetailHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        updateChannelCreatedResponseType,
        updateChannelCreatedResponseHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        updateTeamsChannelCreateMsgType,
        updateTeamsChannelCreateMsgHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        assignmentPagerDutyType,
        assignmentPagerDutyEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        assignmentGnmType,
        assignmentGnmEventHandler,
      );

      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        ownerAssignmentType,
        assignmentEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        assignmentServiceType,
        assignmentServiceEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        updateChatOpsIncidentEventType,
        updateChatOpsIncidentEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        updateTicketProcessType,
        updateChatOpsIncidentEventHandler,
      );
      //initiateTicket Queue
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        createChannelType,
        createChannelHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        receiveChannelCreationType,
        receiveChannelCreationEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        updateTicketType,
        updateTicketInChannelHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKUpdateTicketInEcosystem,
        ecoSystemType,
        updateTicketInChannelHandler,
      );

      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        callBackEventType,
        callbackEventHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        fetchOpenTicketType,
        fetchOpenTicketsHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        registerCustomerEventType,
        registerCustomerHandler,
      );
      msutils.registerJobHandlerByJobType(
        CKCreateIncQueue,
        getUserDataEventType,
        getUserData,
      );
      isHandlerRegistered = true;
    } catch (e) {
      isHandlerRegistered = false;
    }
  }
}

/**
 * Validate Inputs
 * @param transactionid
 * @param request
 * @param accountConfig
 * @param isUpdate
 */
export async function validateInputParamaters(
  transactionid,
  request,
  accountConfig,
  config,
  isUpdate = false,
) {
  logger.info(
    `Validate Input Parameters for ${
      isUpdate ? 'Update' : 'Initiate'
    } Chatops ticket process`,
    {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'validateInputParamaters',
    },
  );
  //validate eventId
  if (request.eventid && !request.eventid.match(regexForANWithColHypUnder)) {
    logger.error(
      `Following input parameter must have a valid value -> eventid `,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter must have a valid value -> eventid`,
    );
  } else if (!request.eventid) {
    request.eventid = '';
  }

  //validate ticketidi
  if (!request.ticketid || !request.ticketid.match(regexForANWithUnder)) {
    logger.error(
      `Following input parameter is mandatory with valid value -> ticketid `,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> ticketid`,
    );
  }

  //validate ticketpriority
  // if (
  //   (isUpdate &&
  //     request.ticketpriority &&
  //     (request.ticketpriority <= 0 || request.ticketpriority >= 5)) ||
  //   (!isUpdate && !request.ticketpriority) ||
  //   request.ticketpriority <= 0 ||
  //   request.ticketpriority >= 5
  // ) {
  //   logger.error(
  //     `Following input parameter is mandatory with valid value -> ticketpriority(1,2,3,4)`,
  //     {
  //       transactionid: `${request.transactionid}`,
  //       class: 'ChatopsKnightController',
  //       function: 'validateInputParamaters',
  //     },
  //   );
  //   throw new HttpErrors.BadRequest(
  //     `Following input parameter is mandatory with valid value -> ticketpriority(1,2,3,4)`,
  //   );
  // } else if (isUpdate && !request.ticketpriority) {
  //   request.ticketpriority = 0;
  // }

  // validate environment
  if (!request.environment) {
    logger.error(
      `Following input parameter is mandatory with valid value -> environment`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> environment`,
    );
  }

  //validate tickettype
  if (
    request.tickettype &&
    !request.tickettype.match(regexForANWithSpaceAmpDotHypUnder)
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> tickettype`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> tickettype`,
    );
  } else if (!request.tickettype) {
    request.tickettype = '';
  }

  //validate ticketdesc
  if (
    (!isUpdate && !request.ticketdesc) ||
    (!isUpdate && request.ticketdesc.trim() === '')
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> ticketdesc`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> ticketdesc`,
    );
  } else {
    if (request.ticketdesc) {
      request.ticketdesc = request.ticketdesc.trim();
    } else {
      request.ticketdesc = '';
    }
  }

  //commenting ticketassignmentgroups for now

  //validate ticketassignmentgroups
  // if (request.ticketassignmentgroups) {
  //   for (const strGroup of request.ticketassignmentgroups) {
  //     if (
  //       !strGroup.match(regexForANWithSpaceAmpDotHypUnder) ||
  //       strGroup.trim() === ''
  //     ) {
  //       logger.error(
  //         `One or more of the following input parameter must have a valid value -> ticketassignmentgroups`,
  //         {
  //           transactionid: `${transactionid}`,
  //           class: 'ChatopsKnightController',
  //           function: 'validateInputParamaters',
  //         },
  //       );
  //       throw new HttpErrors.BadRequest(
  //         `One or more of the following input parameter must have a valid value -> ticketassignmentgroups`,
  //       );
  //     }
  //   }
  // }

  // validate assignmentEmails
  if (request.assignmentemails) {
    const roles = [
      'ROLE_DPE',
      'ROLE_PRACTITIONER',
      'ROLE_INC_COMMANDER',
      'NONE',
    ];
    for (const roleName of request.assignmentemails) {
      const ifExists = roles.includes(roleName.role);
      if (!ifExists) {
        logger.error(
          `Role must have a valid value -> assignmentEmails (ROLE_DPE,ROLE_PRACTITIONER,ROLE_INC_COMMANDER,NONE)`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'validateInputParamaters',
          },
        );
        throw new HttpErrors.BadRequest(
          `Role must have a valid value -> assignmentEmails (ROLE_DPE,ROLE_PRACTITIONER,ROLE_INC_COMMANDER,NONE)`,
        );
      }
    }
  }

  //validate callbackaddress
  if (
    !isUpdate &&
    request.callbackaddress &&
    !request.callbackaddress.match(regexForURL)
  ) {
    logger.error(
      `Following input parameter must have a valid value -> callbackaddress`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter must have a valid value -> callbackaddress`,
    );
  }

  // Temporarily commenting this code as IM needs status as mandatory and otherwise it will show it as "Unknown".
  // But in reality it is optional. IM improvements for fields updates are coming in next sprint.
  // Will uncomment once IM is ready
  /**
    if (
      !(typeof request.status === 'undefined') &&
      !request.status.match(regexForAlphaNumeric)
    ) {
      throw new HttpErrors.BadRequest(
        `Following input parameter must have a valid value -> status`,
      );
    } else if (typeof request.status === 'undefined') {
      request.status = '';
    }
    **/

  //validate Ticket status
  // Temporarily making status as mandatory due to above reason
  if (isUpdate) {
    if (request.status && !request.status.match(regexForAlphaNumeric)) {
      logger.error(
        `Following input parameter must have a valid value -> status`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'validateInputParamaters',
        },
      );
      throw new HttpErrors.BadRequest(
        `Following input parameter must have a valid value -> status`,
      );
    } else if (!request.status) {
      request.status = '';
    }
    //validate statusdescription
    if (request.statusdescription) {
      request.statusdescription = request.statusdescription.trim();
    } else {
      request.statusdescription = '';
    }

    //validate channelId
    if (
      request.channelid &&
      (!request.channelid.match(regexForAlphaNumeric) ||
        !request.channelid.match(regexForANWithAtDotColon))
    ) {
      logger.error(
        `Following input parameter is mandatory with valid value -> channelid`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'validateInputParamaters',
        },
      );
      throw new HttpErrors.BadRequest(
        `Following input parameter is mandatory with valid value -> channelid`,
      );
    }
  }

  //validate ticketimpact
  // if (
  //   !request.ticketimpact ||
  //   (isUpdate &&
  //     !(request.resolvername || request.resolvetime) &&
  //     (request.status.toUpperCase() === 'RESOLVE' ||
  //       request.status.toUpperCase() === 'CLOSE')) ||
  //   accountConfig.itsmServiceType.indexOf('icd') !== -1
  // ) {
  //if Ticketimpact is not provided in the request then try to fetch from tciket tool if configured
  //check itsmEnabled and the job to fetch Ticketdetail
  if (accountConfig.itsmMSEnabled) {
    //add job to fetch the Ticket detail from the ticketing tool
    //temporarily updating to NONE
    if (!request.ticketimpact) {
      request.ticketimpact = 'NONE';
    }
    request.isFetchDetailsRequired = true;
    if (isUpdate) {
      msutils.queueJobByJobType(
        CKCreateIncQueue,
        fetchTicketDetailType,
        {
          accountConfig: accountConfig,
          transactionid: transactionid,
          ticketid: request.ticketid,
          ckRequest: request,
        },
        config.JobQueue.Options,
      );
    }
  }
  // }
  if (
    request.ticketimpact &&
    !validTicketImpacts.includes(request.ticketimpact.toUpperCase())
  ) {
    logger.error(
      `Following input parameter is mandatory with valid value -> ticketimpact(HIGH, MEDIUM, LOW, MAJOR, MINOR, NONE)`,
      {
        transactionid: `${request.transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateInputParamaters',
      },
    );
    throw new HttpErrors.BadRequest(
      `Following input parameter is mandatory with valid value -> ticketimpact(HIGH, MEDIUM, LOW, MAJOR, MINOR, NONE)`,
    );
  }
  return request;
}

/**
 * Checks and generates Transaction ID if missing
 * @param response
 * @param transactionId
 */
export function validateTransationID(response, transactionId) {
  if (!transactionId) {
    transactionId = uuidv4();
  }
  response.setHeader('transactionid', transactionId);
  return transactionId;
}

/**
 * Checks and generates cache for the initiate request key
 * @param crtRequest
 * @param accountCfg
 */
export async function validateDuplicateRequest(crtRequest, accountCfg) {
  const ticketid = crtRequest.ticketid.toUpperCase();
  const cacheKey = accountCfg.accountCode + ticketid + 'directIntegration';
  const ticketIdExistForAccount = await msutils.getCacheValue(cacheKey);
  logger.debug(
    `ticketIdExistForAccount:${JSON.stringify(ticketIdExistForAccount)}`,
  );
  if (ticketIdExistForAccount) {
    return {
      success: false,
      errorMessage: ['Incident / Ticket Channel in progress or already exists'],
    };
  } else {
    await msutils.setAsyncCacheValue(cacheKey, crtRequest, 180);
    return {success: true, errorMessage: []};
  }
}

export async function getOpenTicketsForAccount(
  chatopsSourceId,
  chatopsSourceAPIToken,
  GetOpenticketsForAccountRequest,
  transactionid,
  apiName,
  keyName,
  isSync,
  ProxySource,
) {
  /** start metrics invoked **/
  msutils.metricsQueueJobByJobType('updateMetricsFacts', {
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

  const sourceidentificationcode = chatopsSourceId;
  const config = await msutils.getConfig('', sourceidentificationcode);
  const sourceAPIToken = chatopsSourceAPIToken;
  // const ticketPriority = GetOpenticketsForAccountRequest.ticketPriority;
  // const ticketMajorType = GetOpenticketsForAccountRequest.ticketType;
  const accountCfg = await msutils.getAccountByLocator(
    GetOpenticketsForAccountRequest.accountCodeLocators,
  );
  logger.info(
    `Executing ${apiName} for source id : ${chatopsSourceId} in ${
      isSync ? 'sync' : 'async'
    } mode`,
    {
      transactionid: `${transactionid}`,
      class: 'getOpenTicketsForAccount',
      function: apiName,
    },
  );

  logger.info(`Executing getOpenTicketsForAccount`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'getOpenTicketsForAccount',
  });
  if (!transactionid) {
    logger.error(
      `transactionid in the request header must be defined and should have value.`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'getOpenTicketsForAccount',
      },
    );
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }
  logger.info(`Executing getOpenTicketsForAccount`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'getOpenTicketsForAccount',
  });

  // const sourceCfg = config.sourceSystem;
  const sourceCfg =
    Object.keys(config.sourceSystem).length > 0
      ? config.sourceSystem
      : undefined;
  const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
  if (accountActiveStatus?.gracefullExit) {
    return true;
  }
  if (sourceCfg) {
    if (!sourceAPIToken || sourceAPIToken.trim() === '') {
      logger.error(
        `Missing API Token for system -> ${sourceidentificationcode}`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'getOpenTicketsForAccount',
        },
      );
      throw new HttpErrors.Unauthorized(
        `Missing API Token for system -> ${sourceidentificationcode}`,
      );
    } else {
      try {
        if (
          !(await msutils.validatePayload(
            sourceAPIToken,
            '',
            chatopsSourceId,
            apiName,
            accountCfg.accountCode,
            keyName,
            '',
          ))
        ) {
          logger.error(`Bad API Token for system -> ${chatopsSourceId}`, {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'updateTicketInEcosystem',
          });
          throw new HttpErrors.Unauthorized(
            `Bad API Token for system -> ${chatopsSourceId}`,
          );
        }
      } catch (e) {
        logger.error(`Bad API Token for system -> [${e}]`, {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'updateTicketInEcosystem',
        });
        throw new HttpErrors.Unauthorized(
          `Bad API Token for system -> ${chatopsSourceId}`,
        );
      }
    }
  } else {
    logger.error(
      `Unauthorized request, Invalid ChatOps Source ID or API Key or Token`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateTicketProcess',
      },
    );
    throw new HttpErrors.Unauthorized(
      `Unauthorized request, Invalid ChatOps Source ID or API Key or Token`,
    );
  }

  /** start metrics invoked **/
  const metrics = {
    accountCode: accountCfg?.accountCode,
    api: apiName,
    sourceSystem: chatopsSourceId,
    microservice: ProxySource,
    subFunction: 'default',
    service: 'default',
    command: 'default',
    stage: 'validated',
  };
  msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
  /** end metrics invoked **/

  const data = {
    accountCfg: accountCfg,
    transactionid: transactionid,
    chatopsSourceId: chatopsSourceId,
    isSync: isSync,
    config: config,
    request: GetOpenticketsForAccountRequest,
    metrics: metrics,
  };
  const res = await handleTransmitMode(isSync, accountCfg, apiName, data);
  logger.info(
    `Executed ${apiName} for source id : ${chatopsSourceId} in ${
      isSync ? 'sync' : 'async'
    } mode`,
    {
      transactionid: `${transactionid}`,
      class: 'CollaboratorController',
      function: apiName,
    },
  );
  return res;
}

export async function handleTransmitMode(isSync, accountCfg, apiName, data) {
  logger.info(`Executing handleTransmitMode for isSync->[${isSync}] `);
  //registerHandler();
  //sync mode code
  if (!isSync) {
    //async mode code
    await (
      await msutils
    ).queueJobByJobType(
      CKCreateIncQueue,
      fetchOpenTicketType,
      data,
      isSync,
      data.config.JobQueue.Options,
    );
    return true;
  } else {
    const queueName = await msutils.registerWaitQueue(
      apiName,
      accountCfg.workspaceName,
      fetchOpenTicketsHandler,
      rateLimit,
    );
    const res = await msutils.queueJobAndWait(queueName, data);
    return res;
  }
}

export class SourceSystemConfig {
  isDefault: boolean;
  authType: string;
  callBackUrl: string;
  credentials: {
    userName: string;
    password: string;
    apiKey: string;
  };
  logCallBacks: false;
  logDefaultCallBack: false;
}

/**
 * Gets the callback info
 * @param transactionId
 * @param sourceCfg
 * @param chnlCreateEvent
 */
export function getCallBackConfig(
  transactionId: string,
  sourceCfg,
  externalCallbackaddress,
) {
  const sourceSystemConfig: SourceSystemConfig = new SourceSystemConfig();
  sourceSystemConfig.callBackUrl = externalCallbackaddress;
  if (sourceCfg?.callbackConfig) {
    let currectCallbackConfig;
    let defaultConfig;
    const callbackConfig = sourceCfg.callbackConfig;
    sourceSystemConfig.logCallBacks = callbackConfig.logCallbacks;
    sourceSystemConfig.logDefaultCallBack = callbackConfig.logDefaultCallback;
    if (externalCallbackaddress && callbackConfig?.instanceList) {
      //Find a match for URL provided
      for (const configInstance of Object.keys(callbackConfig.instanceList)) {
        const callbackconfig = callbackConfig.instanceList[configInstance];
        const regex = new RegExp(callbackconfig.match);
        if (externalCallbackaddress.match(regex)) {
          currectCallbackConfig = callbackconfig;
          break;
        }
        if (callbackconfig.default) {
          //if default found keep it handy
          defaultConfig = callbackconfig;
        }
      }
    }

    if (!currectCallbackConfig) {
      if (!defaultConfig && callbackConfig?.instanceList) {
        // Search for default if not found yet
        for (const configInstance of Object.keys(callbackConfig.instanceList)) {
          const callbackconfig = callbackConfig.instanceList[configInstance];
          if (callbackconfig.default) {
            currectCallbackConfig = callbackconfig;
            break;
          }
        }
      } else {
        //use previously found default
        currectCallbackConfig = defaultConfig;
      }
    }

    if (currectCallbackConfig) {
      //build obj
      sourceSystemConfig.callBackUrl = sourceSystemConfig.callBackUrl
        ? sourceSystemConfig.callBackUrl
        : currectCallbackConfig.callbackUrls?.initiateTicketUrl;
      sourceSystemConfig.authType = currectCallbackConfig.authType;
      sourceSystemConfig.isDefault = currectCallbackConfig.default
        ? true
        : false;
      sourceSystemConfig.credentials = {
        userName:
          currectCallbackConfig[currectCallbackConfig.authType].userName,
        password:
          currectCallbackConfig[currectCallbackConfig.authType].password,
        apiKey: currectCallbackConfig[currectCallbackConfig.authType].apiKey,
      };
    }
  }
  if (sourceSystemConfig.logCallBacks) {
    logger.info(
      `Current callback in use --> ${sourceSystemConfig.callBackUrl}`,
      {
        transactionid: `${transactionId}`,
        class: 'ChatopsKnight',
        function: 'getCallBackConfig',
      },
    );
  }
  if (sourceSystemConfig.logDefaultCallBack && sourceSystemConfig.isDefault) {
    logger.info(
      `Using Default callback  --> ${sourceSystemConfig.callBackUrl}`,
      {
        transactionid: `${transactionId}`,
        class: 'ChatopsKnight',
        function: 'getCallBackConfig',
      },
    );
  }
  return sourceSystemConfig;
}

/**
 * Get Basic Auth Token
 * @param userName
 * @param password
 */
export async function getBasicAuthToken(userName: string, password: string) {
  const token =
    'Basic ' +
    Buffer.from(
      msutils.decrypt(userName) + ':' + msutils.decrypt(password),
    ).toString('base64');
  return token;
}

export async function checkForgracefulExit(
  transactionid,
  crtRequest,
  accountCfg,
  sourceCfg,
) {
  const errors: string[] = [];
  //Check for valid priorities
  const currentPriority =
    crtRequest.ticketpriority || crtRequest.ticket?.ticketpriority;
  if (
    accountCfg?.allowedPriorities?.length > 0 &&
    !accountCfg.allowedPriorities?.includes(currentPriority)
  ) {
    logger.info(
      '==================== GRACEFUL EXIT ===========================',
    );
    logger.warn(
      `Aborting Create Ticket Process for Incident ${crtRequest.ticketid} from Account ${accountCfg.accountCode}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'checkForgracefulExit',
      },
    );
    errors.push(
      `Account not configured to accept tickets with Ticket Priority ${currentPriority}`,
    );
  }
  if (sourceCfg.sourceDisabled) {
    //  await callBackMace(crtRequest, accountCfg, transactionid, sourceCfg);
    errors.push(
      `Source Systems not configured to accept request ${accountCfg.accountCode}`,
    );
  }
  return errors;
}

// export async function callBackMace(
//   crtRequest,
//   accountCfg,
//   transactionid,
//   sourceCfg,
// ) {
//   logger.info(
//     `Going to send dummy channel details for ticket: ${crtRequest.ticketid} from Account ${accountCfg.accountCode}`,
//   );
//   // handle CDI mode of sending channel info (dummy).
//   const config = await msutils.getConfig();
//   crtRequest['isIncident'] = false;
//   const data = {
//     chnlCreateEvent: {
//       channelid: 'CHTPSDUM' + crtRequest?.ticketid?.toUpperCase(),
//       channelname: 'CHATOPS-' + crtRequest.ticketid,
//       ticketid: crtRequest.ticketid,
//       channelurl:
//         'https://kyndryl.slack.com/archives/' +
//         'CHTPSDUM' +
//         crtRequest?.ticketid?.toUpperCase(),
//       workspaceid: accountCfg.workspaceName,
//       accountCodeLocators: crtRequest.accountCodeLocators,
//       sourceidentificationcode: sourceCfg.SourceIdentificationCode,
//       externalcallbackaddress: crtRequest.callbackaddress,
//       createRequest: crtRequest,
//     },
//     accountCfg: accountCfg,
//     transactionid: transactionid,
//   };
//   await (
//     await msutils
//   ).queueJobByJobType(
//     CKCreateIncQueue,
//     receiveChannelCreationType,
//     data,
//     config.JobQueue.Options,
//   );
// }

export async function validateReqPayload(
  transactionid,
  crtRequest,
  accountCfg,
  sourceCfg,
) {
  const errors: string[] = [];
  //Check for valid values
  const currentPriority =
    crtRequest.ticketpriority || crtRequest.ticket?.ticketPriority;
  if (
    accountCfg?.allowedPriorities?.length > 0 &&
    !accountCfg.allowedPriorities?.includes(currentPriority)
  ) {
    logger.warn(
      `Aborting Create Ticket Process for Incident ${crtRequest.ticket.ticketId} from Account ${accountCfg.accountCode}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'checkForgracefulExit',
      },
    );
    errors.push(
      `Account not configured to accept tickets with Ticket Priority ${currentPriority}`,
    );
  }
  if (!crtRequest.ticket.ticketId) {
    logger.warn(
      `Aborting update Ecosystem Process for Account${accountCfg.accountCode}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateReqPayload',
      },
    );
    errors.push(`Account not configured to accept request without TicketID`);
  }

  if (!crtRequest.ticket.ticketType) {
    logger.warn(
      `Aborting update Ecosystem Process for Account${accountCfg.accountCode}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'validateReqPayload',
      },
    );
    errors.push(`Account not configured to accept request without Ticket Type`);
  }
  if (crtRequest?.additionalProperties) {
    logger.debug('Additonal Property');
    const addProp = crtRequest.additionalProperties;
    const sourceSys = sourceCfg?.additionalProperties;
    const types = Object.keys(addProp);

    let properties: string[] = [];
    let totalLength = 0;

    //Verify additional Property in  Source System and Payload are valid
    if (Array.isArray(sourceSys)) {
      for (const prop of Object.keys(addProp)) {
        if (!sourceSys.includes(prop)) {
          errors.push(
            `${prop} Attributes not defined in the Chatops Source System`,
          );
        }
      }
    } else {
      types.forEach((typ) => {
        totalLength = totalLength + Object.keys(addProp[typ]).length;
        properties = properties.concat(Object.keys(addProp[typ]));
      });
      const uniqProperties = [...new Set(properties)];
      if (uniqProperties.length === totalLength) {
        logger.debug('duplicate found');
      } else {
        logger.debug('duplicate not found');
        errors.push(`Attributes not defined in the Chatops Source System`);
      }
      for (const typ of types) {
        let res = false;
        const propertiesArr = sourceSys[typ];
        if (sourceSys[typ]) {
          logger.debug(`Source System...${sourceSys[typ]}`);
          for (const prop of Object.keys(addProp[typ])) {
            res = propertiesArr.includes(prop);
            if (!res) {
              break;
            }
          }
        }
        if (!res) {
          logger.debug('Error no allowed');
          errors.push(`Account not configured to accept additional Property`);
          break;
        } else {
          logger.info('Attributes valid with Source System');
        }
      }
    }

    // const recursiveSearch = (obj, map = {}, res: string[] = []) => {
    //   console.log('Inside recursive search...');
    //   Object.keys(obj).forEach(key => {
    //     console.log('Obj');
    //     console.log(key);
    //     if (typeof obj[key] === 'object') {
    //       console.log('1');
    //       return recursiveSearch(obj[key], map, res);
    //     }
    //     console.log('2');
    //     map[obj[key]] = (map[obj[key]] || 0) + 1;
    //     console.log('3');
    //     if (map[obj[key]] === 2) {
    //       console.log('4');
    //       console.log(key);
    //       res.push(key);
    //     }
    //   });
    //   console.log('5');
    //   console.log(res);
    //   console.log(res.length);

    //   return res;
    // };
    //console.log('Recur');
    // if (recursiveSearch.length > 0) {
    //   console.log('Inside..');
    //   errors.push(
    //     `Account not configured to accept duplicate additional Property [${recursiveSearch(
    //       addProp,
    //     )}]`,
    //   );
    // }
    // console.log('Recusr1');
  }
  return errors;
}
