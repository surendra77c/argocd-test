import {Account} from './../models/account.model';
import {v4 as uuidv4} from 'uuid';
import {ChatopsKnightProvider} from '../services';
import * as HttpErrors from 'http-errors';
import * as logger from 'winston';
import * as msutils from 'msutils';
import {
  callBackEventType,
  checkForgracefulExit,
  CKCreateIncQueue,
  createChannelType,
  fetchTicketDetailType,
  ownerAssignmentType,
  receiveChannelCreationType,
  regexForANWithColHypUnder,
  registerHandler,
  updateChannelCreatedResponseType,
  updateChatOpsIncidentEventType,
  updateITSMWithChannelInfoType,
  validateAccount,
  validateInputParamaters,
  validateInputParamatersForReceiveChannelCreationEvent,
  validateReqPayload,
  registerCustomerEventType,
  validateDuplicateRequest,
  assignmentServiceType,
  assignmentPagerDutyType,
  assignmentGnmType,
  updateTeamsChannelCreateMsgType,
  updateTicketProcessType,
  CKUpdateTicketInEcosystem,
  ecoSystemType,
} from '../utils/chatops-knight-utils';
import {
  ProcessCommandRequest,
  ResponseObject,
} from '../models/ckChannelCreateRequest.model';
import {ReceiveChannelCreationEvent} from '../models/receiveChannelEvent.model';
import {ChatopsKnightChannelCreationEvent} from '../models/ckChannelInfo.model';
import {BasicCallBackInfo} from '../models/basicCallBackInfo.model';
import {getUserDataEventType} from '../utils/userMappingUtils';
import {dashboardStatusMap} from '../utils/businessrule.utils';
//import {AutoUpdateTicketRequest} from '../models';
//import {UpdateTicketInChannelRequest} from '../models/updateTicketRequest.model';
const updateMetricsFacts = 'updateMetricsFacts';
export async function updateTicketProcess(
  chatopsSourceId,
  chatopsSourceAPIToken,
  updateEventRequest,
  transactionid,
  isIncident,
  apiName,
  keyName,
  ProxySource = '',
) {
  if (isIncident) {
    updateEventRequest.ticketid = updateEventRequest.incidentid;
    updateEventRequest.tickettype = updateEventRequest.incidenttype;
    updateEventRequest.ticketpriority = updateEventRequest.incidentpriority;
    updateEventRequest.ticketdesc = updateEventRequest.incidentdesc;
    updateEventRequest.ticketimpact = updateEventRequest.incidentimpact;
    updateEventRequest.ticketassignmentgroups =
      updateEventRequest.incidentassignmentgroups;

    delete updateEventRequest['incidentid'];
    delete updateEventRequest['incidenttype'];
    delete updateEventRequest['incidentpriority'];
    delete updateEventRequest['incidentdesc'];
    delete updateEventRequest['incidentimpact'];
    delete updateEventRequest['incidentassignmentgroups'];
  } else {
    updateEventRequest.eventid = updateEventRequest.eventId;
    updateEventRequest.ticketid = updateEventRequest.ticketId;
    updateEventRequest.tickettype = updateEventRequest.ticketType;
    updateEventRequest.ticketpriority = updateEventRequest.ticketPriority;
    updateEventRequest.ticketdesc = updateEventRequest.ticketDesc;
    updateEventRequest.ticketimpact = updateEventRequest.ticketImpact;
    updateEventRequest.ticketassignmentgroups =
      updateEventRequest.ticketAssignmentGroups;
    updateEventRequest.statusdescription = updateEventRequest.statusDescription;
    updateEventRequest.channelid = updateEventRequest.channelId;
    updateEventRequest.resolvetime = updateEventRequest.resolveTime;
    updateEventRequest.sourceidentificationcode =
      updateEventRequest.sourceIdentificationCode;

    delete updateEventRequest['eventId'];
    delete updateEventRequest['ticketId'];
    delete updateEventRequest['ticketType'];
    delete updateEventRequest['ticketPriority'];
    delete updateEventRequest['ticketDesc'];
    delete updateEventRequest['ticketImpact'];
    delete updateEventRequest['ticketAssignmentGroups'];
    delete updateEventRequest['statusDescription'];
    delete updateEventRequest['channelId'];
    delete updateEventRequest['resolveTime'];
    delete updateEventRequest['sourceIdentificationCode'];
  }
  msutils.logInfo(
    `${updateEventRequest.ticketid}:${updateEventRequest?.accountCode}:updateTicket`,
    2,
    transactionid,
  );
  const accountCfg = await msutils.getAccountByLocator(
    updateEventRequest.accountCodeLocators,
  );

  const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
  if (accountActiveStatus?.gracefullExit) {
    return true;
  }
  let sourceCfg;
  //TODO: header auth validation for calls from external systems like CDI
  //TODO: external systems like CDI retry could send duplicate events and such duplicates suppression to be handled
  const sourceidentificationcode = chatopsSourceId;
  const sourceAPIToken = chatopsSourceAPIToken;
  const config = await msutils.getConfig(
    accountCfg.accountCode,
    sourceidentificationcode,
  );

  logger.info(
    `Executing updateTicketProcess for source id : ${chatopsSourceId}`,
    {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketProcess',
    },
  );
  logger.info('================= Update Request ==================');
  logger.info(JSON.stringify(updateEventRequest));
  if (sourceidentificationcode && sourceidentificationcode.trim() !== '') {
    sourceCfg = config?.sourceSystem;
    if (sourceCfg) {
      if (!sourceAPIToken || sourceAPIToken.trim() === '') {
        logger.error(
          `Missing API Token for system -> ${sourceidentificationcode}`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'updateTicketProcess',
          },
        );
        throw new HttpErrors.Unauthorized(
          `Missing API Token for system -> ${sourceidentificationcode}`,
        );
      } else {
        let actualPayload;
        if (isIncident) {
          actualPayload = {
            'CHATOPS-SOURCE-ID': sourceidentificationcode,
            incidentid: updateEventRequest.ticketid,
          };
        } else {
          actualPayload = {
            'X-Chatops-Source-Id': sourceidentificationcode,
            ticketId: updateEventRequest.ticketid,
          };
        }
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

  if (!transactionid) {
    transactionid = uuidv4();
  } else if (!transactionid.match(regexForANWithColHypUnder)) {
    logger.error(`Following header parameter must have a valid value `, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketProcess',
    });
    throw new HttpErrors.BadRequest(
      `Following header parameter must have a valid value -> transactionid`,
    );
  }
  updateEventRequest.sourceidentificationcode = chatopsSourceId;
  updateEventRequest = await validateInputParamaters(
    transactionid,
    updateEventRequest,
    accountCfg,
    config,
    true,
  );

  let sourceIncidentStatusCfg;
  let checkDefaultStatus = false;

  if (!(updateEventRequest.status === '')) {
    if (sourceCfg?.IncidentStatusMap) {
      sourceIncidentStatusCfg = sourceCfg.IncidentStatusMap.find(
        (status) =>
          status.SourceStatus.toUpperCase() ===
          updateEventRequest.status.toUpperCase(),
      );

      if (sourceIncidentStatusCfg) {
        updateEventRequest.status = sourceIncidentStatusCfg.IMStatus;
        if (!updateEventRequest?.statusdescription) {
          updateEventRequest.statusdescription =
            sourceIncidentStatusCfg.Description;
        }
      } else {
        checkDefaultStatus = true;
      }
    } else {
      checkDefaultStatus = true;
    }
    logger.debug(`checkDefaultStatus --> [${checkDefaultStatus}]`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketProcess',
    });

    if (checkDefaultStatus) {
      sourceCfg = await msutils.findSourceSystem('DEFAULT');
      sourceIncidentStatusCfg = sourceCfg.IncidentStatusMap.find(
        (status) =>
          status.SourceStatus.toUpperCase() ===
          updateEventRequest.status.toUpperCase(),
      );
      if (sourceIncidentStatusCfg) {
        updateEventRequest.status = sourceIncidentStatusCfg.IMStatus;
        if (!updateEventRequest.statusdescription) {
          updateEventRequest.statusdescription =
            sourceIncidentStatusCfg.Description;
        }
        updateEventRequest.dashboardStatus =
          sourceIncidentStatusCfg.DashboardValue;
      } else {
        logger.error(
          `Following input parameter must have a valid value status`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'updateTicketProcess',
          },
        );
        throw new HttpErrors.BadRequest(
          `Following input parameter must have a valid value -> status`,
        );
      }
    }
  }

  logger.debug('Received request ', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'updateTicketProcess',
  });

  registerHandler();
  /** start metrics invoked **/
  msutils.metricsQueueJobByJobType(updateMetricsFacts, {
    accountCode: accountCfg?.accountCode,
    api: apiName,
    sourceSystem: 'default',
    microservice: ProxySource,
    subFunction: updateEventRequest?.tickettype
      ? updateEventRequest?.tickettype
      : 'default',
    service: 'default',
    command: 'default',
    stage: 'validated',
  });
  /** end metrics invoked **/

  // placing source info in payload.
  if (!updateEventRequest.isFetchDetailsRequired) {
    msutils.queueJobByJobType(
      CKCreateIncQueue,
      updateTicketProcessType,
      {
        accountCfg: accountCfg,
        transactionid: transactionid,
        updRequest: updateEventRequest,
      },
      config.JobQueue.Options,
    );

    // }
  }
  msutils.logInfo(
    `${updateEventRequest.ticketid}:${updateEventRequest?.accountCode}:updateTicket`,
    3,
    transactionid,
  );
}

export async function initiateProcess(
  chatopsSourceId,
  chatopsSourceAPIToken,
  crtRequest,
  transactionid,
  isIncident,
  apiName,
  keyName,
  isAccountOnboarded,
  ProxySource = '',
) {
  //let dpeEmail = '';
  let assignmentEmails = [];
  if (isIncident) {
    crtRequest.ticketid = crtRequest.incidentid;
    crtRequest.tickettype = crtRequest.incidenttype;
    crtRequest.ticketpriority = crtRequest.incidentpriority;
    crtRequest.ticketdesc = crtRequest.incidentdesc;
    crtRequest.ticketimpact = crtRequest.incidentimpact;
    crtRequest.ticketassignmentgroups = crtRequest.incidentassignmentgroups;
    crtRequest.isIncident = isIncident;

    delete crtRequest['incidentid'];
    delete crtRequest['incidenttype'];
    delete crtRequest['incidentpriority'];
    delete crtRequest['incidentdesc'];
    delete crtRequest['incidentimpact'];
    delete crtRequest['incidentassignmentgroups'];
  } else {
    crtRequest.eventid = crtRequest.eventId;
    crtRequest.ticketid = crtRequest.ticketId;
    crtRequest.tickettype = crtRequest.ticketType;
    crtRequest.ticketpriority = crtRequest.ticketPriority;
    crtRequest.ticketdesc = crtRequest.ticketDesc;
    crtRequest.ticketimpact = crtRequest.ticketImpact;
    crtRequest.ticketassignmentgroups = crtRequest.ticketAssignmentGroups;
    crtRequest.callbackaddress = crtRequest.callbackAddress;
    crtRequest.assignmentemails = crtRequest.assignmentEmails;
    assignmentEmails = crtRequest.assignmentEmails;

    delete crtRequest['eventId'];
    delete crtRequest['ticketId'];
    delete crtRequest['ticketType'];
    delete crtRequest['ticketPriority'];
    delete crtRequest['ticketDesc'];
    delete crtRequest['ticketImpact'];
    delete crtRequest['ticketAssignmentGroups'];
    delete crtRequest['callbackAddress'];
    delete crtRequest['assignmentEmails'];
  }
  let sourceCfg;
  let accountCfg;
  const sourceidentificationcode = chatopsSourceId;
  const sourceAPIToken = chatopsSourceAPIToken;
  if (isAccountOnboarded) {
    accountCfg = await msutils.getAccountByLocator(
      crtRequest.accountCodeLocators,
    );
    accountCfg['isAccountOnboarded'] = true;
  } else {
    //accountCfg = await msutils.getAccountByCode('globalAccount');
    accountCfg = await msutils.getAccountByCode(sourceidentificationcode);
    if (accountCfg) {
      delete accountCfg['_id'];
      accountCfg['accountcode'] = accountCfg.accountCode;
      accountCfg['isAccountOnboarded'] = false;
      accountCfg['assignmentEmails'] = assignmentEmails;
    }
  }
  const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
  if (accountActiveStatus?.gracefullExit) {
    const response: ResponseObject = {
      success: true,
      errorMessage: ['Account is Deactivated'],
    };
    return response;
  }
  msutils.logInfo(
    `${crtRequest.ticketid}:${accountCfg?.accountCode}:initiateTicket`,
    2,
    transactionid,
  );
  logger.info(
    `Executing initiateChatOpsIncidentProcess for source id : ${chatopsSourceId}`,
    {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'initiateChatOpsIncidentProcess',
    },
  );

  const config = await msutils.getConfig(
    accountCfg.accountCode,
    sourceidentificationcode,
  );
  //TODO: header auth validation for calls from external systems like CDI
  //TODO: external systems like CDI retry could send duplicate events and such duplicates suppression to be handled
  if (assignmentEmails?.length) {
    accountCfg['assignmentEmails'] = assignmentEmails;
  }

  if (sourceidentificationcode) {
    // sourceCfg = config.sourceSystem;
    sourceCfg =
      config.sourceSystem && Object.keys(config.sourceSystem).length > 0
        ? config.sourceSystem
        : undefined;
    if (sourceCfg) {
      if (!sourceAPIToken) {
        logger.error(
          `Missing API Token for system -> ${sourceidentificationcode}`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'initiateChatOpsIncidentProcess',
          },
        );
        throw new HttpErrors.Unauthorized(
          `Missing API Token for system -> ${sourceidentificationcode}`,
        );
      } else {
        let actualPayloadExtractArray;
        let actualPayloadExtractArrayNoCallbkAddr;
        if (isIncident && isAccountOnboarded) {
          actualPayloadExtractArray = {
            'CHATOPS-SOURCE-ID': sourceidentificationcode,
            incidentid: crtRequest.ticketid,
            callbackaddress: crtRequest.callbackaddress,
          };
          actualPayloadExtractArrayNoCallbkAddr = {
            'CHATOPS-SOURCE-ID': sourceidentificationcode,
            incidentid: crtRequest.ticketid,
          };
        } else {
          actualPayloadExtractArray = {
            'X-Chatops-Source-Id': sourceidentificationcode,
            ticketId: crtRequest.ticketid,
            callbackAddress: crtRequest.callbackaddress,
          };
          actualPayloadExtractArrayNoCallbkAddr = {
            'X-Chatops-Source-Id': sourceidentificationcode,
            ticketId: crtRequest.ticketid,
          };
        }
        const actualPayload = !crtRequest.callbackaddress
          ? actualPayloadExtractArrayNoCallbkAddr
          : actualPayloadExtractArray;
        logger.debug(JSON.stringify(actualPayload));
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
                function: 'initiateChatOpsIncidentProcess',
              },
            );
            throw new HttpErrors.Unauthorized(
              `Bad API Token for system -> ${sourceidentificationcode}`,
            );
          }
        } catch (e) {
          if (String(e).includes('NotAcceptableError')) {
            crtRequest.blockAction = true;
            logger.error(
              `Acction Restricted by Account for Source system [${e}]`,
              {
                transactionid: transactionid,
                class: 'ChatopsKnightController',
                function: 'initiateChatOpsIncidentProcess',
              },
            );
          } else {
            logger.error(
              `an error ocurred in initiateChatOpsIncidentProcess [${e}]`,
              {
                transactionid: transactionid,
                class: 'ChatopsKnightController',
                function: 'initiateChatOpsIncidentProcess',
              },
            );
            throw new HttpErrors.Unauthorized(
              `Bad API Token for system -> ${sourceidentificationcode}`,
            );
          }
        }
      }
    } else {
      logger.error(`System unregistered -> ${sourceidentificationcode}`, {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'initiateChatOpsIncidentProcess',
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
        function: 'initiateChatOpsIncidentProcess',
      },
    );
    throw new HttpErrors.Unauthorized(
      `Unauthorized request without ChatOps Source ID & API Key/Token`,
    );
  }

  if (!transactionid) {
    transactionid = uuidv4();
  } else if (!transactionid.match(regexForANWithColHypUnder)) {
    throw new HttpErrors.BadRequest(
      `Following header parameter must have a valid value -> transactionid`,
    );
  }
  registerHandler();

  if (!crtRequest.callbackaddress) {
    if (config?.sourceSystem) {
      // sourceCfg = config.sourceSystem;
      sourceCfg =
        Object.keys(config.sourceSystem).length > 0
          ? config.sourceSystem
          : undefined;
      crtRequest.callbackaddress = sourceCfg?.CallBackUrl || '';
    }
  }

  crtRequest = await validateInputParamaters(
    transactionid,
    crtRequest,
    accountCfg,
    config,
  );
  if (crtRequest?.status) {
    crtRequest = await dashboardStatusMap(sourceCfg, crtRequest);
  }

  //deleting property as its specific to update
  //delete crtRequest['isFetchDetailsRequired'];

  logger.debug(`Received request`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'initiateChatOpsIncidentProcess',
  });
  const gracefulExitErrors = await checkForgracefulExit(
    transactionid,
    crtRequest,
    accountCfg,
    sourceCfg,
  );

  //Response object
  const response: ResponseObject = {
    success: true,
    errorMessage: [],
  };
  if (gracefulExitErrors?.length > 0) {
    response.success = false;
    response.errorMessage = gracefulExitErrors;
  } else {
    //Check for Duplicate Request
    const validDupReq = await validateDuplicateRequest(crtRequest, accountCfg);
    if (!validDupReq.success) {
      return validDupReq;
    }
    msutils.queueJobByJobType(
      CKCreateIncQueue,
      createChannelType,
      {
        accountCfg: accountCfg,
        transactionid: transactionid,
        crtRequest: crtRequest,
        sourceidentificationcode: sourceidentificationcode,
      },
      config.JobQueue.Options,
    );

    msutils.logInfo(
      `${crtRequest.ticketid}:${accountCfg?.accountCode}:initiateTicket`,
      3,
      transactionid,
    );

    /** start metrics validated **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: accountCfg?.accountCode,
      api: apiName,
      sourceSystem: sourceidentificationcode,
      microservice: ProxySource,
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'validated',
    });
    /** end metrics validated **/
  }
  return response;
}

// function mergeRules (rules) {
//   let mergedRule, assignments, defaultassignments, defaultindexchannels;
//   for(const rule of rules) {
//     defaultindexchannels = [...defaultindexchannels, ...rule.defaultindexchannels ]
//     defaultassignments = [...defaultassignments, ...rule.defaultassignments ]
//     assignments = [...assignments, ...rule.assignments ]

//   }
//   const {accountCode, chatPlatform, workspace} = rules[0];
//   mergedRule = {accountCode, chatPlatform, workspace, defaultassignments, defaultindexchannels, assignments};
//   return mergedRule;
// }

// function replaceAccountInfo(accountInfo, rule, collaborationTool){

//   accountInfo.defaultassignments = rule.defaultassignments;
//   accountInfo.defaultassignments = rule.defaultindexchannels;
//   accountInfo.defaultassignments = rule.workspace;
//   if(collaborationTool.toLowerCase() === 'teams'){
//     accountInfo.defaultassignments = rule.chatPlatform;
//   }
//   accountInfo.defaultassignments = rule.assignments;
//   return accountInfo;
// }

// /**
//  * Get the rule which matches with the incoming incident details
//  * @param assignmentGroup
//  * @param priority
//  * @param impact
//  */
// async function getMatchingRule(
//   rules,
//   assignmentGroup: string,
//   priority: number,
//   impact: string,
// ) {
//   // let filteredRules;
//   // filteredRules = rules.filter(rule => rule.assignmentGroup === assignmentGroup);
//   const rulesAssignmentGroup = rules.filter(
//     (rule) => rule.assignmentGroup === assignmentGroup,
//   );
//   if (rulesAssignmentGroup?.length) {
//     const rulesAssignmentPriority = rulesAssignmentGroup.filter(
//       (rule) => rule.priority === priority,
//     );
//     if (rulesAssignmentPriority?.length) {
//       const rulesAssignPrioImpact = rulesAssignmentPriority.filter(
//         (rule) => rule.impact === impact,
//       );
//       if (rulesAssignPrioImpact?.length) {
//         return rulesAssignPrioImpact;
//       } else {
//         return rulesAssignmentPriority;
//       }
//     } else {
//       const rulesAssignmentImpact = rulesAssignmentGroup.filter(
//         (rule) => rule.impact === impact,
//       );
//       if (rulesAssignmentImpact?.length) {
//         return rulesAssignmentImpact;
//       } else {
//         return rulesAssignmentGroup;
//       }
//     }
//   } else {
//     const rulesPriority = rules.filter((rule) => rule.priority === priority);
//     if (rulesPriority?.length) {
//       const rulesPriorityImpact = rulesPriority.filter(
//         (rule) => rule.impact === impact,
//       );
//       if (rulesPriorityImpact?.length) {
//         return rulesPriorityImpact;
//       } else {
//         return rulesPriority;
//       }
//     } else {
//       const rulesImpact = rules.filter((rule) => rule.impact === impact);
//       if (rulesImpact?.length) {
//         return rulesImpact;
//       } else {
//         return null;
//       }
//     }
//   }
// }

/**
 * Process Command from Channel Event
 * @param transactionid
 * @param processCommandRequest
 */
export async function processCommand(
  transactionid: string,
  processCommandRequest: ProcessCommandRequest,
  apiName: string,
) {
  const config = await msutils.getConfig(null, null);
  const chatopsknight = new ChatopsKnightProvider().value();
  logger.info(`Executing processCommand`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'processCommand',
  });
  if (!transactionid) {
    logger.error(
      `transactionid in the request header must be defined and should have value.`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'processCommand',
      },
    );
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }

  registerHandler();

  logger.debug('processCommand: Invoked', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'processCommand',
  });
  let crtRequest: Object = {};
  const accountCode = processCommandRequest.accountCode;
  const commandParams = processCommandRequest.parameters;
  const accountCodeLocators = [
    {
      SearchKey: 'accountCode',
      SearchValue: accountCode,
    },
  ];
  crtRequest['accountCodeLocators'] = accountCodeLocators;
  crtRequest['ticketid'] = commandParams['ticketid']?.trim();
  crtRequest['tickettype'] = commandParams['tickettype']?.trim();
  crtRequest['ticketpriority'] = commandParams['ticketpriority']?.trim();
  crtRequest['ticketdesc'] = commandParams['ticketdesc']?.trim();
  crtRequest['ticketimpact'] = commandParams['ticketimpact']?.trim();
  crtRequest['environment'] = commandParams['environment']?.trim();
  crtRequest['isMajor'] = commandParams['isMajor'];
  let eventid = commandParams['eventid'];
  if (eventid) {
    eventid = eventid.trim();
  } else {
    eventid = '';
  }
  crtRequest['eventid'] = eventid;
  let ticketassignmentgroups: string[] = [];
  if (commandParams['ticketassignmentgroups']) {
    ticketassignmentgroups = commandParams['ticketassignmentgroups'].split(',');
  } else {
    ticketassignmentgroups = [];
  }
  crtRequest['ticketassignmentgroups'] = ticketassignmentgroups;
  crtRequest['channelCreateRequest'] = processCommandRequest.msgRequest;

  const accountCfg = await msutils.getAccountByLocator(
    crtRequest['accountCodeLocators'],
  );
  const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
  if (accountActiveStatus?.gracefullExit) {
    return true;
  }

  try {
    crtRequest = await validateInputParamaters(
      transactionid,
      crtRequest,
      accountCfg,
      config,
    );
    crtRequest['callbackaddress'] = '';
    msutils.queueJobByJobType(
      CKCreateIncQueue,
      createChannelType,
      {
        accountCfg: accountCfg,
        transactionid: transactionid,
        crtRequest: crtRequest,
        sourceidentificationcode: '',
      },
      config.JobQueue.Options,
    );
  } catch (error) {
    logger.error(`an error ocurred in createChatOpsTicketProcess [${error}]`, {
      transactionid: transactionid,
      class: 'ChatopsKnightController',
      function: 'processCommand',
    });
    const errorMessage = {text: error.message};
    //Error: Invalid URI "/acknowledgeMessage"\n' +
    const chatopsChanneleventUrl = await msutils.getMsUrl(
      'chatopsChannelevent',
    );
    if (chatopsChanneleventUrl)
      await (
        await chatopsknight
      ).acknowledgeMessage(
        chatopsChanneleventUrl,
        transactionid,
        processCommandRequest.msgRequest,
        errorMessage,
      );
  }
  return true;
}

export async function updateTicketInEcoSystem(
  transactionid: string,
  updateTicketInChannelRequest,
  chatopsSourceId: string,
  chatopsSourceAPIToken: string,
  apiName: string,
  keyName: string,
  ProxySource = 'internal',
  autoRoutingReq = 'false',
  reqRoutedFrom = '',
) {
  const sourceCode = chatopsSourceId;
  const sourceAPIToken = chatopsSourceAPIToken;

  const config = await msutils.getConfig('', sourceCode);

  logger.info(
    `Executing updateTicketInEcosystem for external system : ${sourceCode}`,
    {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketInEcosystem',
    },
  );

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

  //validate fields
  //1.validate the srcIdentificationCode
  if (!sourceCode || sourceCode.trim() === '') {
    logger.error(
      `Unauthorized request without ChatOps Source ID & API Key/Token`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateTicketInEcosystem',
      },
    );

    throw new HttpErrors.Unauthorized(
      `Unauthorized request without ChatOps Source ID & API Key/Token`,
    );
  }
  let sourceCfg = config?.sourceSystem;
  //2. validate sourceConfig
  if (!sourceCfg) {
    logger.error(`System unregistered -> ${sourceCode}`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketInEcosystem',
    });
    throw new HttpErrors.Unauthorized(`System unregistered -> ${sourceCode}`);
  }
  //3.validate sourceAPIToken
  if (!sourceAPIToken || sourceAPIToken.trim() === '') {
    logger.error(`Missing API Token for system -> ${sourceCode}`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketInEcosystem',
    });
    throw new HttpErrors.Unauthorized(
      `Missing API Token for system -> ${sourceCode}`,
    );
  }

  const accountCfg = await validateAccount(
    updateTicketInChannelRequest,
    transactionid,
  );

  const routingEnabledRequest = autoRoutingReq === 'true' ? true : false;

  logger.debug(`is Request enabled for routing - ${autoRoutingReq}`);

  const satRoutingEnabled = process.env.SAT_ROUTING_ENABLED;

  logger.debug(
    `is Routing Enabled through the environment - ${satRoutingEnabled}`,
  );

  if (!accountCfg && routingEnabledRequest && satRoutingEnabled === 'true') {
    const headers = {
      'content-type': 'application/json',
    };
    const headersMap = new Map([
      ['X-Chatops-Source-Id', sourceCode],
      ['X-Chatops-Source-Api-Token', sourceAPIToken],
      ['X-Chatops-Key', keyName],
      ['X-Transaction-Id', transactionid],
      ['X-Routing-Req', autoRoutingReq],
      ['X-Req-Routed-From', process.env.ROUTING_GEO],
    ]);

    for (const [key, value] of headersMap.entries()) {
      if (value) {
        headers[key] = value;
      }
    }

    const {isReqRouted, error} = await msutils.doesAPIRequireRouting(
      headers,
      updateTicketInChannelRequest,
      apiName,
      config,
      'post',
    );

    if (isReqRouted) {
      if (error) {
        throw error;
      }
      return true;
    }
  }

  //for external source system the payload considers source code and ticketid
  const actualPayload = {
    'X-Chatops-Source-Id': sourceCode,
    ticketId: updateTicketInChannelRequest.ticket.ticketId,
  };

  let accountCode = '';
  if (accountCfg) {
    accountCode = accountCfg.accountCode;
  } else {
    accountCode = sourceCode;
  }
  const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
  if (accountActiveStatus?.gracefullExit) {
    return true;
  }
  // 4.validate the payload sourceAPIToken
  try {
    if (
      !(await msutils.validatePayload(
        sourceAPIToken,
        actualPayload,
        chatopsSourceId,
        apiName,
        accountCode,
        keyName,
      ))
    ) {
      logger.error(`Bad API Token for system -> ${sourceCode}`, {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateTicketInEcosystem',
      });
      throw new HttpErrors.Unauthorized(
        `Bad API Token for system -> ${sourceCode}`,
      );
    }
  } catch (e) {
    logger.error(`Bad API Token for system -> [${e}]`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketInEcosystem',
    });
    throw new HttpErrors.Unauthorized(
      `Bad API Token for system -> ${sourceCode}`,
    );
  }
  if (!transactionid) {
    transactionid = uuidv4();
  } else if (!transactionid.match(regexForANWithColHypUnder)) {
    logger.error(`Following header parameter must have a valid value `, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketInEcosystem',
    });
    throw new HttpErrors.BadRequest(
      `Following header parameter must have a valid value -> transactionid`,
    );
  }

  // Payload Verfication
  const reqPaylodErrors = await validateReqPayload(
    transactionid,
    updateTicketInChannelRequest,
    accountCfg,
    sourceCfg,
  );

  if (reqPaylodErrors.length > 0) {
    logger.error(`Bad Request for system -> ${reqPaylodErrors}`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketInEcosystem',
    });
    throw new HttpErrors.BadRequest(`${reqPaylodErrors}`);
  }

  const {eventId, ...updateTicket} = updateTicketInChannelRequest.ticket;
  const {
    ticketId: ticketid,
    ticketType: tickettype,
    ticketDesc: ticketdesc,
    ticketAssignmentGroups: ticketassignmentgroups,
    statusDescription: statusdescription,
    ticketPriority: ticketpriority,
    ticketImpact: ticketimpact,
    resolverName: resolvername,
    resolveTime: resolvetime,
    ...remaining
  } = updateTicket;

  if (eventId) {
    logger.debug('eventId removed from request');
  } else {
    logger.debug('eventId not found in request');
  }

  const ticket = {
    ticketid,
    tickettype,
    ticketdesc,
    ticketassignmentgroups,
    statusdescription,
    ticketpriority,
    ticketimpact,
    resolvername,
    resolvetime,
    ...remaining,
  };

  updateTicketInChannelRequest.ticket = ticket;

  // let enterpriseName;
  //this is a test comment
  // if (accountCfg) {
  //   enterpriseName = accountCfg?.enterprise?.toLowerCase();
  // } else {
  //   const accSourceCfg = await msutils.getAccountByCode(sourceCode);
  //   enterpriseName = accSourceCfg?.enterprise?.toLowerCase();
  // }

  let emaiIds = [];
  const assignmentEmails =
    updateTicketInChannelRequest?.channelConfig?.assignmentEmails;
  if (assignmentEmails) {
    assignmentEmails.forEach((element) => {
      emaiIds = emaiIds.concat(element.email);
    });
  }
  const notificationEmails =
    updateTicketInChannelRequest?.information?.notificationEmails;
  if (notificationEmails) {
    notificationEmails.forEach((element) => {
      emaiIds = emaiIds.concat(element.email);
    });
  }

  if (emaiIds) {
    const valid = await msutils.validateEnterpriseEmails('', emaiIds);
    if (!valid) {
      throw new HttpErrors.BadRequest(
        `Email Id's passed in request have few invalid entries which does not matches with enterprise name.`,
      );
    }
  }
  if (sourceCfg.autoIndexChannelCreation) {
    updateTicketInChannelRequest.autoIndexChannelCreation =
      sourceCfg.autoIndexChannelCreation;
  }

  const isValidRoutedFrom = await msutils.validateReqRoutedFrom(reqRoutedFrom);

  if (isValidRoutedFrom) {
    updateTicketInChannelRequest.routedFrom = reqRoutedFrom;
  }

  let sourceIncidentStatusCfg;
  let checkDefaultStatus = false;

  if (!(updateTicketInChannelRequest.ticket?.['status'] === '')) {
    if (sourceCfg.IncidentStatusMap) {
      sourceIncidentStatusCfg = sourceCfg.IncidentStatusMap.find(
        (status) =>
          status.SourceStatus.toUpperCase() ===
          updateTicketInChannelRequest.ticket?.['status'].toUpperCase(),
      );

      if (sourceIncidentStatusCfg) {
        updateTicketInChannelRequest.ticket['status'] =
          sourceIncidentStatusCfg.IMStatus;
      } else {
        checkDefaultStatus = true;
      }
    } else {
      checkDefaultStatus = true;
    }
    logger.debug(`checkDefaultStatus --> [${checkDefaultStatus}]`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateTicketProcess',
    });
    if (checkDefaultStatus) {
      /* eslint-disable */
      if (
        updateTicketInChannelRequest.ticket &&
        updateTicketInChannelRequest.ticket.status
      ) {
        sourceCfg = await msutils.findSourceSystem('DEFAULT');
        sourceIncidentStatusCfg = sourceCfg.IncidentStatusMap.find(
          (status) =>
            status.SourceStatus.toUpperCase() ===
            updateTicketInChannelRequest.ticket?.status.toUpperCase(),
        );
      }
      /* eslint-enable */
      if (sourceIncidentStatusCfg) {
        updateTicketInChannelRequest.ticket.status =
          sourceIncidentStatusCfg.IMStatus;
      } else {
        logger.error(
          `Following input parameter must have a valid value status`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'updateTicketProcess',
          },
        );
        throw new HttpErrors.BadRequest(
          `Following input parameter must have a valid value -> status`,
        );
      }
    }
  }
  const ticketType = updateTicketInChannelRequest.ticket.tickettype;
  /** start metrics invoked **/
  msutils.metricsQueueJobByJobType(updateMetricsFacts, {
    accountCode: accountCode,
    api: apiName,
    sourceSystem: sourceCode,
    microservice: ProxySource,
    subFunction: ticketType,
    service: 'default',
    command: 'default',
    stage: 'validated',
  });
  /** end metrics invoked **/

  registerHandler();
  if (!updateTicketInChannelRequest.callbackUrl) {
    if (sourceCfg.CallBackUrl && sourceCfg.CallBackUrl.trim() !== '') {
      updateTicketInChannelRequest.callbackUrl = sourceCfg.CallBackUrl;
    }
  }
  if (sourceCode.toUpperCase() === 'SAT') {
    msutils.logInfo(
      `${updateTicketInChannelRequest?.ticket?.ticketid}:${updateTicketInChannelRequest?.blueId}:${updateTicketInChannelRequest?.name}:${updateTicketInChannelRequest?.deviceSource}:updateTicketInEcosystem`,
      1,
      transactionid,
    );
  }

  // updateTicketInChannelRequest.sourceidentificationcode = chatopsSourceId;
  //add job queue for updating the index channel with message
  msutils.queueJobByJobType(
    CKUpdateTicketInEcosystem,
    ecoSystemType,
    {
      accountCode: accountCfg?.accountCode || '',
      transactionid: transactionid,
      request: updateTicketInChannelRequest,
      dashboardStatus: sourceIncidentStatusCfg.DashboardValue,
      sourceCode: sourceCode,
      //config: config,
    },
    config.JobQueue.Options,
  );
}

export async function auttUpDateTicket(
  transactionid: string,
  updateTicketRequest,
  chatopsSourceId: string,
) {
  const accountCfg = await msutils.getAccountByLocator(
    updateTicketRequest.accountCodeLocators,
  );
  const config = await msutils.getConfig(
    accountCfg.accountCode,
    chatopsSourceId,
  );
  logger.info(`Internal ticket update for request`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: '_autoUpdateTicket',
  });
  // for a call back from DummyTicket ticketdetail is null
  // Hence, Moving this assignment
  updateTicketRequest.sourceidentificationcode = chatopsSourceId;
  const defaultSource = await msutils.getDefaultSourceSystem();

  const sourceIncidentStatusCfg = defaultSource[0].IncidentStatusMap.find(
    (status) =>
      status.SourceStatus.toUpperCase() ===
      updateTicketRequest.status.toUpperCase(),
  );

  if (sourceIncidentStatusCfg) {
    updateTicketRequest.dashboardStatus =
      sourceIncidentStatusCfg.DashboardValue;
  }
  const assignmentGroupArr = updateTicketRequest.ticketassignmentgroups;
  let ticketAssignmentGroups = [];
  if (assignmentGroupArr) {
    ticketAssignmentGroups = assignmentGroupArr.filter(function (group) {
      group = group.trim();
      if (group.length > 0) return group;
    });
  }

  logger.debug(
    `IS SourceID assigned':${updateTicketRequest.sourceidentificationcode}`,
  );
  registerHandler();

  const ticketDetail = updateTicketRequest.ticketDetail;
  if (ticketDetail) {
    if (updateTicketRequest.ticketimpact === 'NONE') {
      //add incidentimapct info
      updateTicketRequest.ticketimpact =
        ticketDetail['impact'] === '3'
          ? 'Low'
          : ticketDetail['impact'] === '2'
          ? 'Medium'
          : ticketDetail['impact'] === '1'
          ? 'High'
          : '';
    }
    if (!updateTicketRequest.resolver) {
      updateTicketRequest.resolver = ticketDetail['resolved_by'];
    }
    if (!updateTicketRequest.resolvetime) {
      updateTicketRequest.resolvetime = ticketDetail['resolved_at'];
    }
    if (ticketDetail['isMajor']) {
      updateTicketRequest.isMajor = ticketDetail['isMajor'];
    }
    if (ticketDetail['affectedSite']) {
      updateTicketRequest.affectedSite = ticketDetail['affectedSite'];
    }
    if (
      (!updateTicketRequest.ticketassignmentgroups ||
        (ticketAssignmentGroups && ticketAssignmentGroups.length <= 0)) &&
      ticketDetail['assignment_group']
    ) {
      updateTicketRequest.ticketassignmentgroups = [];
      updateTicketRequest.ticketassignmentgroups.push(
        ticketDetail['assignment_group'],
      );
    }
    if (ticketDetail['owner']) {
      updateTicketRequest.owner = ticketDetail['owner'];
    }
    // updateTicketRequest.sourceidentificationcode = chatopsSourceId; // moved to out of if
  }

  msutils.queueJobByJobType(
    CKCreateIncQueue,
    updateChatOpsIncidentEventType,
    {
      accountCfg: accountCfg,
      transactionid: transactionid,
      updRequest: updateTicketRequest,
    },
    config.JobQueue.Options,
  );
}

/**
 * Function Called to Perform actions on channel Created
 * @param transactionid
 * @param rvcChnlCreateEvent
 */
export async function recievedChannelCreatedEvent(
  transactionid: string,
  rvcChnlCreateEvent: ReceiveChannelCreationEvent,
) {
  msutils.logInfo(
    `${rvcChnlCreateEvent?.payload?.ticketid}:${rvcChnlCreateEvent?.payload?.accountcode}:initiateTicket`,
    9,
    transactionid,
  );
  const config = await msutils.getConfig(null, null);
  registerHandler();
  logger.info(`Executing receiveChannelCreationEvent`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'receiveChannelCreationEvent',
  });
  /** start metrics **/
  const codeAccount = rvcChnlCreateEvent?.payload?.accountcode;
  // let isMajor = 'default';
  // if (rvcChnlCreateEvent?.payload?.createRequest) {
  //   isMajor = rvcChnlCreateEvent?.payload?.createRequest['isMajor']
  //     ? 'major'
  //     : 'default';
  // }
  msutils.metricsQueueJobByJobType(updateMetricsFacts, {
    accountCode: codeAccount ? codeAccount : 'default',
    api: 'initiateTicket',
    sourceSystem: 'default',
    microservice: 'internal',
    subFunction: 'default',
    service: 'default',
    command: 'default',
    stage: 'completed',
  });
  /** end metrics **/
  if (!transactionid) {
    logger.error(
      `transactionid in the request header must be defined and should have value.`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'receiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }
  if (rvcChnlCreateEvent.status) {
    const ckChannelCreationEvent: ChatopsKnightChannelCreationEvent = <
      ChatopsKnightChannelCreationEvent
    >rvcChnlCreateEvent.payload!;

    validateInputParamatersForReceiveChannelCreationEvent(
      ckChannelCreationEvent,
    );
    const accountCfg = await msutils.getAccountByCode(
      ckChannelCreationEvent?.accountcode,
    );
    if (!accountCfg) {
      logger.error(
        `Account ${ckChannelCreationEvent.accountcode} is not onboarded`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'receiveChannelCreationEvent',
        },
      );
      throw new HttpErrors.BadRequest(
        `Account ${ckChannelCreationEvent.accountcode} is not onboarded`,
      );
    }
    if (ckChannelCreationEvent?.externalcallbackaddress) {
      msutils.queueJobByJobType(
        CKCreateIncQueue,
        receiveChannelCreationType,
        {
          accountCfg: accountCfg,
          transactionid: transactionid,
          chnlCreateEvent: ckChannelCreationEvent,
        },
        config.JobQueue.Options,
      );
    }
    if (
      ckChannelCreationEvent.createRequest?.['channelCreateRequest'] &&
      Object.keys(
        ckChannelCreationEvent.createRequest?.['channelCreateRequest'],
      ).length > 0
    ) {
      const channelCreateRequest =
        ckChannelCreationEvent.createRequest['channelCreateRequest'];
      if (ckChannelCreationEvent.collabTool?.toUpperCase() === 'TEAMS') {
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          updateTeamsChannelCreateMsgType,
          {
            channelCreateRequest,
            transactionid,
            data: {
              callbackid: ckChannelCreationEvent.callbackid,
              channelname: ckChannelCreationEvent.channelname,
            },
          },
          config.JobQueue.Options,
        );
      } else {
        const message = {
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Channel *${ckChannelCreationEvent.channelname}* created:\n*<${ckChannelCreationEvent.channelurl}>*`,
              },
            },
          ],
        };
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          updateChannelCreatedResponseType,
          {
            message,
            transactionid,
            channelCreateRequest,
          },
          config.JobQueue.Options,
        );
      }

      /** start metrics **/
      msutils.metricsQueueJobByJobType('updateMetricsFacts', {
        accountCode: accountCfg ? accountCfg?.accountCode : 'default',
        api: 'processCommand',
        sourceSystem: 'default',
        microservice: 'internal',
        subFunction: 'default',
        service: 'default',
        command: 'create_incident',
        stage: 'completed',
      });
      /** start metrics **/
    }
    logger.debug('if channelExists');
    if (!ckChannelCreationEvent.channelExists) {
      //calls to be made when channel dosent exist and its created for the first time
      /* eslint-disable */
      if (accountCfg.itsmMSEnabled) {
        if (
          ckChannelCreationEvent.createRequest &&
          ckChannelCreationEvent.createRequest['isFetchDetailsRequired']
        ) {
          msutils.queueJobByJobType(
            CKCreateIncQueue,
            fetchTicketDetailType,
            {
              accountConfig: accountCfg,
              transactionid: transactionid,
              ticketid: ckChannelCreationEvent.ticketid,
              ckRequest: ckChannelCreationEvent.createRequest,
            },
            config.JobQueue.Options,
          );
        }
        /* eslint-enable */
        logger.debug('updateITSMWithChannelInfoType');
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          updateITSMWithChannelInfoType,
          {
            accountCfg: accountCfg,
            transactionid: transactionid,
            chnlCreateEvent: ckChannelCreationEvent,
          },
          config.JobQueue.Options,
        );
      }
      logger.debug(' ownerAssignmentType');

      msutils.queueJobByJobType(
        CKCreateIncQueue,
        ownerAssignmentType,
        {
          accountCfg: accountCfg,
          transactionid: transactionid,
          chnlCreateEvent: ckChannelCreationEvent,
        },
        config.JobQueue.Options,
      );

      //Check Account has any related Assignment Services
      const assSerData = await msutils.fetchFromStore('AssignmentServices', {
        accountCode: accountCfg.accountCode,
      });

      if (assSerData.length > 0) {
        //Call Assignment Service
        logger.debug('Started-Call-Assignment-Service');
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          assignmentServiceType,
          {
            accountCfg: accountCfg,
            transactionid: transactionid,
            chnlCreateEvent: ckChannelCreationEvent,
            assSerData: assSerData,
          },
          config.JobQueue.Options,
        );
      }

      console.log(
        `accountCfg.pagerDutyAssignments-----${JSON.stringify(accountCfg)}`,
      );
      if (accountCfg.pagerDutyAssignments) {
        //Call PagerDutyAssignment Service
        logger.debug('Started-Call-PagerDuty-Assignment-Service');
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          assignmentPagerDutyType,
          {
            accountCfg: accountCfg,
            transactionid: transactionid,
            chnlCreateEvent: ckChannelCreationEvent,
            assSerData: assSerData,
            pagerDutyAssignments: accountCfg.pagerDutyAssignments,
          },
          config.JobQueue.Options,
        );
      }

      console.log(
        `gnmAssignments-----${JSON.stringify(
          ckChannelCreationEvent?.mappedRule,
        )}`,
      );
      if (
        ckChannelCreationEvent?.mappedRule?.['gnmAssignments'] === 'Yes' &&
        ckChannelCreationEvent?.mappedRule?.['gnmMapping'] === 'Yes'
      ) {
        //Call PagerDutyAssignment Service
        logger.debug('Started-Call-GNM-Assignment-Service');
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          assignmentGnmType,
          {
            accountCfg: accountCfg,
            transactionid: transactionid,
            chnlCreateEvent: ckChannelCreationEvent,
          },
          config.JobQueue.Options,
        );
      }
    }
  } else {
    const errorPayload = rvcChnlCreateEvent.error.payload;
    if (errorPayload && Object.keys(errorPayload).length > 0) {
      logger.debug(`Making a call to post -> [${transactionid}]`, {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'receiveChannelCreationEvent',
      });
      msutils.queueJobByJobType(
        CKCreateIncQueue,
        updateChannelCreatedResponseType,
        {
          message: {
            text: `Error from IM: ${rvcChnlCreateEvent.error.message}`,
          },
          transactionid: transactionid,
          channelCreateRequest: errorPayload,
        },
        config.JobQueue.Options,
      );
    }
    logger.error('Error from IM: ' + rvcChnlCreateEvent.error.message, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'receiveChannelCreationEvent',
    });

    /** start metrics invoked **/
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: 'initiateTicket',
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'error',
    });
    /** end metrics invoked **/
  }
}

export async function ticketInChannelCallbackEvent(
  transactionid: string,
  callbackReq: BasicCallBackInfo,
) {
  msutils.logInfo(
    `${callbackReq?.sourceCode}:initiateTicket`,
    9,
    transactionid,
  );
  const config = await msutils.getConfig(null, null);
  registerHandler();
  logger.info(`Executing ticketInChannelCallbackEvent`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'ticketInChannelCallbackEvent',
  });
  if (!transactionid) {
    logger.error(
      `transactionid in the request header must be defined and should have value.`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'receiveChannelCreationEvent',
      },
    );
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }

  //handle success response
  if (callbackReq.message) {
    logger.debug(`Making a call to post -> [${transactionid}]`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'ticketInChannelCallbackEvent',
    });
    msutils.queueJobByJobType(
      CKCreateIncQueue,
      callBackEventType,
      {
        transactionid: transactionid,
        callbackReq: callbackReq,
      },
      config.JobQueue.Options,
    );
    logger.info('Response from IM: ' + callbackReq.message, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'ticketInChannelCallbackEvent',
    });
  }

  //handle error
  if (callbackReq.error) {
    const errorPayload = callbackReq.error.payload;
    if (errorPayload && Object.keys(errorPayload).length > 0) {
      logger.debug(
        `Making a call to post for error payload-> [${transactionid}]`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'ticketInChannelCallbackEvent',
        },
      );
      msutils.queueJobByJobType(
        CKCreateIncQueue,
        callBackEventType,
        {
          transactionid: transactionid,
          callbackReq: callbackReq,
        },
        config.JobQueue.Options,
      );
    }
    logger.error('Error from IM: ' + callbackReq.error.message, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'ticketInChannelCallbackEvent',
    });
  }

  /** start metrics **/
  msutils.metricsQueueJobByJobType('updateMetricsFacts', {
    accountCode: 'default',
    api: 'updateTicketInEcosystem',
    sourceSystem: 'default',
    microservice: 'internal',
    subFunction: 'default',
    service: 'default',
    command: 'default',
    stage: 'completed',
  });
  /** end metrics **/
}

/**
 * Process register_customer command from Channel Event
 * @param transactionid
 * @param processCommandRequest
 */
export async function processRegisterCustCommand(
  transactionid: string,
  processCommandRequest: ProcessCommandRequest,
  apiName: string,
) {
  logger.info(`Executing processRegisterCustCommand`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'processRegisterCustCommand',
  });
  if (!transactionid) {
    logger.error(
      `transactionid in the request header must be defined and should have value.`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'processRegisterCustCommand',
      },
    );
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }
  const chatopsknight = new ChatopsKnightProvider().value();
  try {
    const config = await msutils.getConfig(null, null);
    const commandParams = processCommandRequest.parameters;
    let customerName = '';
    if (commandParams['customername'])
      customerName = commandParams['customername'];

    registerHandler();

    if (customerName === '') {
      logger.info(`customername is empty`, {
        transactionid: transactionid,
        class: 'ChatopsKnightController',
        function: 'processRegisterCustCommand',
      });
      const chatopsChanneleventUrl = await msutils.getMsUrl(
        'chatopsChannelevent',
      );
      const response = {text: 'Invalid command to register customer'};
      if (chatopsChanneleventUrl)
        await (
          await chatopsknight
        ).acknowledgeMessage(
          chatopsChanneleventUrl,
          transactionid,
          processCommandRequest.msgRequest,
          response,
        );
    } else {
      msutils.queueJobByJobType(
        CKCreateIncQueue,
        registerCustomerEventType,
        {
          transactionid: transactionid,
          updRequest: processCommandRequest,
        },
        config.JobQueue.Options,
      );

      logger.debug('processRegisterCustCommand: Invoked', {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'processRegisterCustCommand',
      });
    }
  } catch (error) {
    logger.error(`an error ocurred in processRegisterCustCommand [${error}]`, {
      transactionid: transactionid,
      class: 'ChatopsKnightController',
      function: 'processRegisterCustCommand',
    });
    const errorMessage = {text: error.message};
    //Error: Invalid URI "/acknowledgeMessage"\n' +
    const chatopsChanneleventUrl = await msutils.getMsUrl(
      'chatopsChannelevent',
    );
    if (chatopsChanneleventUrl)
      await (
        await chatopsknight
      ).acknowledgeMessage(
        chatopsChanneleventUrl,
        transactionid,
        processCommandRequest.msgRequest,
        errorMessage,
      );
  }

  return true;
}

/**
 * Process user info command from Channel Event
 * @param transactionid
 * @param processCommandRequest
 */
export async function processuserInfoCommand(
  transactionid: string,
  processCommandRequest: ProcessCommandRequest,
  apiName: string,
) {
  logger.info(`Executing processRegisterCustCommand`, {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'processRegisterCustCommand',
  });
  if (!transactionid) {
    logger.error(
      `transactionid in the request header must be defined and should have value.`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'processRegisterCustCommand',
      },
    );
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }
  if (!processCommandRequest?.parameters['email']) {
    logger.error(`emailid in  must be defined and should have value.`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'processRegisterCustCommand',
    });
    throw new HttpErrors.BadRequest(
      `emailid must be defined and should have value.`,
    );
  }
  const chatopsknight = new ChatopsKnightProvider().value();
  try {
    const config = await msutils.getConfig(null, null);
    registerHandler();
    msutils.queueJobByJobType(
      CKCreateIncQueue,
      getUserDataEventType,
      {
        transactionid: transactionid,
        userInfoRequest: processCommandRequest,
        email: processCommandRequest?.parameters['email'],
      },
      config.JobQueue.Options,
    );
    logger.debug('processuserInfoCommand: Invoked', {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'processRegisterCustCommand',
    });
  } catch (error) {
    logger.error(`an error ocurred in processuserInfoCommand [${error}]`, {
      transactionid: transactionid,
      class: 'ChatopsKnightController',
      function: 'processRegisterCustCommand',
    });
    const errorMessage = {text: error.message};
    //Error: Invalid URI "/acknowledgeMessage"\n' +
    const chatopsChanneleventUrl = await msutils.getMsUrl(
      'chatopsChannelevent',
    );
    if (chatopsChanneleventUrl)
      await (
        await chatopsknight
      ).acknowledgeMessage(
        chatopsChanneleventUrl,
        transactionid,
        processCommandRequest.msgRequest,
        errorMessage,
      );
  }

  return true;
}

export async function getAccountBoarded(
  accountCodeLocators,
  apiName,
  keyName,
  transactionid,
  sourceidentificationcode,
  chatopsSourceAPIToken,
  config,
) {
  const response: Account = new Account();
  if (sourceidentificationcode && sourceidentificationcode.trim() !== '') {
    const sourceCfg = config?.sourceSystem;
    if (sourceCfg) {
      if (!chatopsSourceAPIToken || chatopsSourceAPIToken.trim() === '') {
        logger.error(
          `Missing API Token for system -> ${sourceidentificationcode}`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'getAccountBoarded',
          },
        );
        throw new HttpErrors.Unauthorized(
          `Missing API Token for system -> ${sourceidentificationcode}`,
        );
      } else {
        const actualPayload = {
          'X-Chatops-Source-Id': sourceidentificationcode,
          'X-Transaction-Id': transactionid,
        };
        try {
          if (
            !(await msutils.validatePayload(
              chatopsSourceAPIToken,
              actualPayload,
              sourceidentificationcode,
              apiName,
              '',
              keyName,
            ))
          ) {
            logger.error(
              `Bad API Token for system -> ${sourceidentificationcode}`,
              {
                transactionid: `${transactionid}`,
                class: 'ChatopsKnightController',
                function: 'getAccountBoarded',
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
            function: 'getAccountBoarded',
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
        function: 'getAccountBoarded',
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
        function: 'getAccountBoarded',
      },
    );
    throw new HttpErrors.Unauthorized(
      `Unauthorized request without ChatOps Source ID & API Key/Token`,
    );
  }

  msutils.metricsQueueJobByJobType(updateMetricsFacts, {
    accountCode: 'default',
    api: apiName,
    sourceSystem: 'default',
    microservice: 'internal',
    subFunction: 'default',
    service: 'default',
    command: 'default',
    stage: 'validated',
  });

  let accountCfg;
  try {
    accountCfg = await msutils.getAccountByLocator(accountCodeLocators);

    if (accountCfg) {
      response.accountCode = accountCfg.accountCode;
      response.enabled = true;
      response.accountCodeLocator = accountCodeLocators;
      response[accountCodeLocators[0].searchKey] =
        accountCodeLocators[0].searchValue;
    }
  } catch (e) {
    let errorMessage;
    if (e instanceof Error) {
      if (
        e.message.indexOf(
          'No accounts have been onboarded with the matching account locator search parameters combination',
        ) > -1
      ) {
        errorMessage = 'Account is not onboarded';
      }

      if (
        e.message.indexOf(
          'More than one account has been found with the matching account locator search parameters combination. It MUST uniquely match only one account.',
        ) > -1
      ) {
        errorMessage = 'Insufficient information provided for account search.';
      }
      response.enabled = false;
      if (errorMessage) {
        response.message = errorMessage;
      }
      response.accountCodeLocator = accountCodeLocators;
      response[accountCodeLocators[0].searchKey] =
        accountCodeLocators[0].searchValue;
    }

    logger.error(e);
    msutils.metricsQueueJobByJobType(updateMetricsFacts, {
      accountCode: 'default',
      api: apiName,
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'error',
    });
  }
  msutils.metricsQueueJobByJobType(updateMetricsFacts, {
    accountCode: 'default',
    api: apiName,
    sourceSystem: 'default',
    microservice: 'internal',
    subFunction: 'default',
    service: 'default',
    command: 'default',
    stage: 'completed',
  });
  return response;
}
