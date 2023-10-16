import {ChatopsKnightProvider} from '../services';
import * as HttpErrors from 'http-errors';
import * as logger from 'winston';
import * as msutils from 'msutils';
import {
  getBasicAuthToken,
  getCallBackConfig,
  SourceSystemConfig,
} from '../utils/chatops-knight-utils';

/**
 * @function createChannelHandler
 * @summary "helper method for initiate incident details call to Incident Manager Microservice"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function createChannelHandler(job) {
  const accountCfg = job.data.accountCfg;
  const transactionid = job.data.transactionid;
  const crtRequest = job.data.crtRequest;
  const sourceidentificationcode = job.data.sourceidentificationcode;
  const chatopsknight = new ChatopsKnightProvider().value();

  //TODO: if ('incidentassignmentgroups') not null, store 'incidentassignmentgroups' for the incoming event into redis cache, so as to be retrieved later after channel creation to be passed to assignment service
  //TODO: make internal call to find default bot assignments ids for account  -- This is being picked up from config/default.json which will then move to Mongo
  // const defaultbotassignmentCfg = accountCfg.Assignments.find(
  //   assignment => assignment.default === true && assignment.bots === true,
  // );
  //call Inc manager //queue sep
  logger.debug('BEGIN -> Send create channel details to Inc manager', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'createChannelHandler',
  });
  //NOTE: in below call passing external systems like CDI callbackaddress url just to get it back later from IM, though IM doesn't use it. Else we have to store it in cache and retrieve rather than sending to IM.

  try {
    logger.debug(
      `Creating channel for accountcode :: ${accountCfg.accountcode} and ticketid :: ${crtRequest.ticketid}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'createChannelHandler',
      },
    );
    // Sending Extra params for execincident
    let extraProp = {};
    if (crtRequest.tickettype === 'execincident') {
      extraProp = {
        start_time: crtRequest.start_time,
        last_updated_time: crtRequest.last_updated_time,
        work_notes: crtRequest.work_notes,
        close_notes: crtRequest.close_notes ? crtRequest.close_notes : '',
        breach_time: crtRequest.breach_time ? crtRequest.breach_time : '',
        reported_priority: crtRequest.reported_priority
          ? crtRequest.reported_priority
          : '',
        incident_url: crtRequest.incident_url ? crtRequest.incident_url : '',
        problem_id: crtRequest.problem_id ? crtRequest.problem_id : '',
        problem_id_url: crtRequest.problem_id_url
          ? crtRequest.problem_id_url
          : '',
        has_breached: crtRequest.has_breached ? crtRequest.has_breached : '',
      };
    }
    const imUrl = await msutils.getMsUrl('chatopsIncidentManager');

    await (
      await chatopsknight
    ).createChannel(
      imUrl,
      crtRequest.accountCodeLocators,
      sourceidentificationcode ? sourceidentificationcode : '',
      transactionid,
      accountCfg.accountcode,
      crtRequest.eventid,
      crtRequest.ticketid,
      crtRequest.tickettype ? crtRequest.tickettype : '',
      parseInt(crtRequest.ticketpriority),
      crtRequest.ticketdesc,
      crtRequest.ticketimpact,
      crtRequest.ticketassignmentgroups
        ? crtRequest.ticketassignmentgroups
        : [],
      crtRequest.environment,
      accountCfg.defaultassignments ? accountCfg.defaultassignments : [],
      crtRequest.callbackaddress ? crtRequest.callbackaddress : '',
      crtRequest.isFetchDetailsRequired
        ? crtRequest.isFetchDetailsRequired
        : false,
      crtRequest.channelCreateRequest ? crtRequest.channelCreateRequest : {},
      crtRequest.isIncident ? crtRequest.isIncident : false,
      crtRequest.isMajor ? crtRequest.isMajor : false,
      crtRequest.additionalProperties ? crtRequest.additionalProperties : {},
      accountCfg.isAccountOnboarded ? true : false,
      crtRequest.blockAction ? true : false,
      accountCfg.assignmentEmails ? accountCfg.assignmentEmails : [],
      crtRequest.status ? crtRequest.status : 'INPROGRESS',
      extraProp,
    );
  } catch (e) {
    logger.error(e.message);
    throw new HttpErrors.InternalServerError(e);
  }

  logger.debug('END -> Send create channel details to Inc manager', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'createChannelHandler',
  });
}

/**
 * @function updateChatOpsIncidentEventHandler
 * @summary "helper method for update incident details call to Incident Manager Microservice"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function updateChatOpsIncidentEventHandler(job) {
  try {
    const accountCfg = job.data.accountCfg;
    const transactionid = job.data.transactionid;
    const updRequest = job.data.updRequest;
    const chatopsknight = new ChatopsKnightProvider().value();
    logger.debug('BEGIN -> Send update ticket details to Inc manager', {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateChatOpsIncidentEventHandler',
    });
    try {
      logger.debug(
        `Updating channel for accountcode :: ${accountCfg.accountcode} and ticketid :: ${updRequest.ticketid}`,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'updateChatOpsIncidentEventHandler',
        },
      );
      const imUrl = await msutils.getMsUrl('chatopsIncidentManager');
      await (
        await chatopsknight
      ).updateChannel(
        imUrl,
        transactionid,
        accountCfg.accountcode,
        updRequest.eventid,
        updRequest.ticketid,
        updRequest.tickettype ? updRequest.tickettype : '',
        updRequest.ticketpriority,
        updRequest.ticketdesc,
        updRequest.ticketimpact,
        updRequest.ticketassignmentgroups
          ? updRequest.ticketassignmentgroups
          : [],
        updRequest.environment,
        updRequest.status,
        updRequest.statusdescription,
        updRequest.dashboardStatus ? updRequest.dashboardStatus : {},
        updRequest.channelid ? updRequest.channelid : '',
        updRequest.resolver ? updRequest.resolver : '',
        updRequest.resolvetime ? updRequest.resolvetime : '',
        updRequest.owner ? updRequest.owner : '',
        updRequest.sourceidentificationcode
          ? updRequest.sourceidentificationcode
          : '',
        updRequest.isMajor ? updRequest.isMajor : false,
        updRequest.affectedSite ? updRequest.affectedSite : '',
        updRequest.start_time ? updRequest.start_time : '',
        updRequest.last_updated_time ? updRequest.last_updated_time : '',
        updRequest.work_notes ? updRequest.work_notes : '',
        updRequest.close_notes ? updRequest.close_notes : '',
        updRequest.breach_time ? updRequest.breach_time : '',
        updRequest.reported_priority ? updRequest.reported_priority : '',
        updRequest.incident_url ? updRequest.incident_url : '',
        updRequest.problem_id ? updRequest.problem_id : '',
        updRequest.problem_id_url ? updRequest.problem_id_url : '',
        updRequest.has_breached ? updRequest.has_breached : '',
      );
    } catch (e) {
      throw new HttpErrors.InternalServerError(e);
    } // channelid is not passed im works based on the channel  which in turn is derived based on incidentid directly
    // this may need to be reviewed if we have to generalize to ms teams or revised naming convention
    logger.debug('END -> Send update ticket details to Inc manager', {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'updateChatOpsIncidentEventHandler',
    });
  } catch (e) {
    logger.error(e);
  }
}

/**
 * @function receiveChannelCreationEventHandler
 * @summary "helper method for receive incident channel details call from Incident Manager Microservice"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function receiveChannelCreationEventHandler(job) {
  const transactionid = job.data.transactionid;
  const chnlCreateEvent = job.data.chnlCreateEvent;
  const chatopsknight = new ChatopsKnightProvider().value();
  const sourceidentificationcode = chnlCreateEvent.sourceidentificationcode;
  //const config = await msutils.getConfig("",sourceidentificationcode);
  let sourceCfg;

  //TODO: Store channel info and event id in internal datastore - we can store a trace of a flow, once it resolves we should clear, and we keep it in MongoDB
  if (sourceidentificationcode) {
    sourceCfg = await msutils.findSourceSystem(sourceidentificationcode);

    if (sourceCfg) {
      //notify external url on ack //queue sep
      //TODO additional params as per scope if needed
      logger.debug(
        'BEGIN -> Send back channel info details to ' +
          sourceidentificationcode,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'receiveChannelCreationEventHandler',
        },
      );
      try {
        const callbackConfig: SourceSystemConfig = getCallBackConfig(
          transactionid,
          sourceCfg,
          chnlCreateEvent.externalcallbackaddress,
        );
        if (callbackConfig?.callBackUrl) {
          if (callbackConfig.authType?.toLowerCase() === 'basicauth') {
            //create basic header
            logger.info('Using Basic Auth [' + sourceidentificationcode + ']', {
              transactionid: `${transactionid}`,
              class: 'ChatopsKnightController',
              function: 'receiveChannelCreationEventHandler',
            });

            const basicAuthToken = await getBasicAuthToken(
              callbackConfig.credentials.userName,
              callbackConfig.credentials.password,
            );
            if (chnlCreateEvent.createRequest['isIncident']) {
              await (
                await chatopsknight
              ).sendbackChannelInfoWithBasicAuth(
                basicAuthToken,
                callbackConfig.callBackUrl,
                JSON.stringify(chnlCreateEvent.accountCodeLocators),
                transactionid,
                chnlCreateEvent.channelid,
                chnlCreateEvent.channelname,
                chnlCreateEvent.ticketid,
                chnlCreateEvent.channelurl,
                chnlCreateEvent.workspaceid,
              );
            } else {
              await (
                await chatopsknight
              ).sendbackTicketChannelInfoWithBasicAuth(
                basicAuthToken,
                callbackConfig.callBackUrl,
                JSON.stringify(chnlCreateEvent.accountCodeLocators),
                transactionid,
                chnlCreateEvent.channelid,
                chnlCreateEvent.channelname,
                chnlCreateEvent.ticketid,
                chnlCreateEvent.channelurl,
                chnlCreateEvent.workspaceid,
              );
            }
          } else if (callbackConfig.authType?.toLowerCase() === 'apikey') {
            logger.info('Using apiKey [' + sourceidentificationcode + ']', {
              transactionid: `${transactionid}`,
              class: 'ChatopsKnightController',
              function: 'receiveChannelCreationEventHandler',
            });

            const userName = msutils.decrypt(
              callbackConfig.credentials.userName,
            );
            const apiKey = msutils.decrypt(callbackConfig.credentials.apiKey);

            if (chnlCreateEvent.createRequest['isIncident']) {
              await (
                await chatopsknight
              ).sendbackChannelInfoWithApiKey(
                userName,
                apiKey,
                callbackConfig.callBackUrl,
                JSON.stringify(chnlCreateEvent.accountCodeLocators),
                transactionid,
                chnlCreateEvent.channelid,
                chnlCreateEvent.channelname,
                chnlCreateEvent.ticketid,
                chnlCreateEvent.channelurl,
                chnlCreateEvent.workspaceid,
              );
            } else {
              await (
                await chatopsknight
              ).sendbackTicketChannelInfoWithApiKey(
                userName,
                apiKey,
                callbackConfig.callBackUrl,
                JSON.stringify(chnlCreateEvent.accountCodeLocators),
                transactionid,
                chnlCreateEvent.channelid,
                chnlCreateEvent.channelname,
                chnlCreateEvent.ticketid,
                chnlCreateEvent.channelurl,
                chnlCreateEvent.workspaceid,
              );
            }
          } else {
            if (chnlCreateEvent.createRequest['isIncident']) {
              await (
                await chatopsknight
              ).sendbackChannelInfoWithoutAuth(
                callbackConfig.callBackUrl,
                JSON.stringify(chnlCreateEvent.accountCodeLocators),
                transactionid,
                chnlCreateEvent.channelid,
                chnlCreateEvent.channelname,
                chnlCreateEvent.ticketid,
                chnlCreateEvent.channelurl,
                chnlCreateEvent.workspaceid,
              );
            } else {
              await (
                await chatopsknight
              ).sendbackTicketChannelInfoWithoutAuth(
                callbackConfig.callBackUrl,
                JSON.stringify(chnlCreateEvent.accountCodeLocators),
                transactionid,
                chnlCreateEvent.channelid,
                chnlCreateEvent.channelname,
                chnlCreateEvent.ticketid,
                chnlCreateEvent.channelurl,
                chnlCreateEvent.workspaceid,
              );
            }
          }
        }
      } catch (ex) {
        logger.error(
          `ERROR -> Send back channel info details to ${sourceidentificationcode}, message - ${ex.message}, stack trace - ${ex.stack}`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'receiveChannelCreationEventHandler',
          },
        );
        throw ex; //TODO As part of error handling only retry if errors are of type intermmitent
      }

      logger.debug(
        'END -> Send back channel info details to ' + sourceidentificationcode,
        {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'receiveChannelCreationEventHandler',
        },
      );
    } else {
      throw new HttpErrors.Unauthorized(
        `System unregistered -> ${sourceidentificationcode}`,
      );
    }
  } else {
    logger.error(`Unauthorized request without ChatOps Source ID`, {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'receiveChannelCreationEventHandler',
    });
    throw new HttpErrors.Unauthorized(
      `Unauthorized request without ChatOps Source ID`,
    );
  }
}

export async function callbackEventHandler(job) {
  const transactionid = job.data.transactionid;
  const message = job.data.callbackReq.message;
  const sourceCode = job.data.callbackReq.sourceCode;
  const callbackUrl = job.data.callbackReq.callbackUrl;
  const sourceCfg = await msutils.findSourceSystem(sourceCode);
  const chatopsknight = new ChatopsKnightProvider().value();
  logger.debug(
    'BEGIN -> Send back ticket update details to external source' + sourceCode,
    {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'callbackEventHandler',
    },
  );

  try {
    const callbackConfig: SourceSystemConfig = getCallBackConfig(
      transactionid,
      sourceCfg,
      callbackUrl,
    );
    if (callbackConfig?.callBackUrl) {
      if (
        callbackConfig?.authType &&
        callbackConfig.authType.toLowerCase() === 'basicauth'
      ) {
        //create basicAuth header
        logger.info('Using Basic Auth [' + sourceCode + ']', {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'sourceCode',
        });

        const basicAuthToken = await getBasicAuthToken(
          callbackConfig.credentials.userName,
          callbackConfig.credentials.password,
        );

        await (
          await chatopsknight
        ).sendbackCallBackWithAuth(
          basicAuthToken,
          callbackConfig.callBackUrl,
          transactionid,
          message,
        );
      } else if (
        callbackConfig?.authType &&
        callbackConfig.authType.toLowerCase() === 'apikey'
      ) {
        logger.info('Using apikey [' + sourceCode + ']', {
          transactionid: `${transactionid}`,
          class: 'ChatopsKnightController',
          function: 'sourceCode',
        });
        const userName = msutils.decrypt(callbackConfig.credentials.userName);
        const apiKey = msutils.decrypt(callbackConfig.credentials.apiKey);
        await (
          await chatopsknight
        ).sendbackCallBackWithApiKey(
          userName,
          apiKey,
          callbackConfig.callBackUrl,
          transactionid,
          message,
        );
      } else {
        await (
          await chatopsknight
        ).sendbackCallBackWithoutAuth(
          callbackConfig.callBackUrl,
          transactionid,
          message,
        );
      }
    }
  } catch (ex) {
    logger.error(
      `ERROR -> Send back ticket update details to external source ${sourceCode}, message - ${ex.message}, stack trace - ${ex.stack}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'receiveChannelCreationEventHandler',
      },
    );

    /** start metrics **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'updateTicketInEcosystem',
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'default',
      stage: 'error',
    });
    /** end metrics **/

    throw ex; //TODO As part of error handling only retry if errors are of type intermmitent
  }

  logger.debug(
    'END -> Send back ticket update details to external source ' + sourceCode,
    {
      transactionid: `${transactionid}`,
      class: 'ChatopsKnightController',
      function: 'receiveChannelCreationEventHandler',
    },
  );
}

/**
 * @function updateITSMWithChannelInfoEventHandler
 * @summary "helper method for receiveChannelCreationEventHandler to update channel info in ITSM (ticketing system)"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function updateITSMWithChannelInfoEventHandler(job) {
  const accountCfg = job.data.accountCfg;
  const transactionid = job.data.transactionid;
  const chnlCreateEvent = job.data.chnlCreateEvent;
  const chatopsknight = new ChatopsKnightProvider().value();

  if (accountCfg?.itsmMSEnabled && accountCfg?.toolInitiateComment) {
    //check if Ticketid exisits for this account
    if (chnlCreateEvent?.ticketid) {
      //TODO: we have to call the abstract ITSM service, which calls the itsm snow service in turn, but since it is not implemented yet, parking a call to itsm-snow

      logger.info('BEGIN -> call ticketing service', {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateITSMWithChannelInfoEventHandler',
      });
      try {
        logger.debug(
          `Updating channel for in ticketing tool :: ${accountCfg.accountcode} and ticketid :: ${chnlCreateEvent.ticketid}`,
          {
            transactionid: `${transactionid}`,
            class: 'ChatopsKnightController',
            function: 'updateITSMWithChannelInfoEventHandler',
          },
        );
        const itsmUrl = await msutils.getMsUrl('chatopsItsm');
        await (
          await chatopsknight
        ).updateChannelIdInTicketingSystem(
          itsmUrl,
          transactionid,
          chnlCreateEvent.accountcode,
          chnlCreateEvent.eventid,
          chnlCreateEvent.ticketid,
          chnlCreateEvent.channelid,
          chnlCreateEvent.channelname,
          chnlCreateEvent.channelurl,
        );
      } catch (e) {
        throw new HttpErrors.InternalServerError(e);
      }
      logger.info('END -> call ticketing service', {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateITSMWithChannelInfoEventHandler',
      });
    }
  }
}

/**
 * @function updateChannelCreatedResponseHandler
 * @summary "helper method for receiveChannelCreationEventHandler to update channel info in ITSM (ticketing system)"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function updateChannelCreatedResponseHandler(job) {
  const message = job.data.message;
  const transactionid = job.data.transactionid;
  const channelCreateRequest = job.data.channelCreateRequest;
  const chatopsknight = new ChatopsKnightProvider().value();

  logger.info('BEGIN -> Sending Response of CreateChannel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'updateChannelCreatedResponseHandler',
  });
  try {
    logger.debug(
      `Updating channel created status for transactionid :: ${transactionid}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'updateChannelCreatedResponseHandler',
      },
    );
    const channeleventMSUrl = await msutils.getMsUrl('chatopsChannelevent');
    await (
      await chatopsknight
    ).updateChannelCreatedStatus(
      channeleventMSUrl,
      transactionid,
      channelCreateRequest,
      message,
    );
  } catch (e) {
    throw new HttpErrors.InternalServerError(e);
  }

  logger.info('END -> Sent Response of CreateChannel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'updateChannelCreatedResponseHandler',
  });
}

/**
 * @function assignmentEventHandler
 * @summary "helper method for receiveChannelCreationEvent to trigger Ticket owner assignment into Ticket channel"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function assignmentEventHandler(job) {
  const transactionid = job.data.transactionid;
  const chnlCreateEvent = job.data.chnlCreateEvent;
  const chatopsknight = new ChatopsKnightProvider().value();
  // const sourceId = chnlCreateEvent.sourceidentificationcode;
  logger.info('BEGIN -> assign owner to channel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentEventHandler',
  });
  try {
    logger.debug(
      `Assigning owner to collaborator for transactionid:: ${transactionid}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'assignmentEventHandler',
      },
    );
    const chatopsAssignmentUrl = await msutils.getMsUrl('chatopsAssignment');
    logger.debug(chatopsAssignmentUrl);
    await (
      await chatopsknight
    ).assignOwnerToCollaborator(
      chatopsAssignmentUrl,
      transactionid,
      chnlCreateEvent.channelid,
      chnlCreateEvent.accountcode,
      chnlCreateEvent.ticketid,
      chnlCreateEvent?.mappedRule,
    );
  } catch (e) {
    throw new HttpErrors.InternalServerError(e);
  }
  logger.info('END -> assign owner to channel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentEventHandler',
  });
}

/**
 * @function assignmentPagerDutyEventHandler
 * @summary "Method to assign pagerDuty services on Call users to the incident group"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function assignmentPagerDutyEventHandler(job) {
  const transactionid = job.data.transactionid;
  const chnlCreateEvent = job.data.chnlCreateEvent;
  const pagerDutyAssignments = job.data.pagerDutyAssignments;
  const chatopsknight = new ChatopsKnightProvider().value();
  logger.info('BEGIN -> assign members to channel from PagerDuty', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentPagerDutyEventHandler',
  });
  try {
    const chatopsAssignmentUrl = await msutils.getMsUrl(
      'chatopsAssignmentServices',
    );
    logger.debug(chatopsAssignmentUrl);
    //console.log(`pagerDutyAPIKey-----${JSON.stringify(pagerDutyAPIKey)}`);
    console.log(
      `pagerDutyAssignments-----${JSON.stringify(pagerDutyAssignments)}`,
    );
    try {
      await (
        await chatopsknight
      ).assignPagerDutyOwnerToCollaborator(
        chatopsAssignmentUrl,
        transactionid,
        chnlCreateEvent.channelid,
        chnlCreateEvent.accountcode,
        chnlCreateEvent.ticketid,
        pagerDutyAssignments,
      );
    } catch (error) {
      console.log(`error-----${JSON.stringify(error)}`);
    }
  } catch (e) {
    throw new HttpErrors.InternalServerError(e);
  }
  logger.info('END -> assign owner to channel from Pager Duty Assignment', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentEventHandler',
  });
}

/**
 * @function assignmentGnmEventHandler
 * @summary "helper method for receiveChannelCreationEvent to trigger GNM assignment into Ticket channel"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function assignmentGnmEventHandler(job) {
  const transactionid = job.data.transactionid;
  const chnlCreateEvent = job.data.chnlCreateEvent;
  const chatopsknight = new ChatopsKnightProvider().value();
  // const sourceId = chnlCreateEvent.sourceidentificationcode;
  logger.info('BEGIN -> assign GNM group to channel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentGnmEventHandler',
  });
  try {
    logger.debug(
      `Assigning GNM group to collaborator for transactionid:: ${transactionid}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'assignmentGnmEventHandler',
      },
    );
    const chatopsAssignmentGnmUrl = await msutils.getMsUrl(
      'chatopsAssignmentGroups',
    );
    logger.debug(chatopsAssignmentGnmUrl);
    await (
      await chatopsknight
    ).assignGnmGrpToCollaborator(
      chatopsAssignmentGnmUrl,
      transactionid,
      chnlCreateEvent.channelid,
      chnlCreateEvent.accountcode,
      chnlCreateEvent.createRequest,
      chnlCreateEvent?.mappedRule,
    );
  } catch (e) {
    throw new HttpErrors.InternalServerError(e);
  }
  logger.info('END -> assign GNM group to channel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentGnmEventHandler',
  });
}

/**
 * @function assignmentServiceEventHandler
 * @summary "helper method for receiveChannelCreationEvent to trigger Ticket owner assignment into Ticket channel"
 * @param {job} this is queued job object that contains  all required and optional params
 */
export async function assignmentServiceEventHandler(job) {
  const transactionid = job.data.transactionid;
  const chnlCreateEvent = job.data.chnlCreateEvent;
  const chatopsknight = new ChatopsKnightProvider().value();
  // const sourceId = chnlCreateEvent.sourceidentificationcode;
  logger.info('BEGIN -> assign members to channel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentServiceEventHandler',
  });
  try {
    logger.debug(
      `Assigning member to collaborator for transactionid:: ${transactionid}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'assignmentServiceEventHandler',
      },
    );
    const chatopsAssignmentUrl = await msutils.getMsUrl(
      'chatopsAssignmentServices',
    );
    logger.debug(chatopsAssignmentUrl);
    await (
      await chatopsknight
    ).assignOwnerToCollaborator(
      chatopsAssignmentUrl,
      transactionid,
      chnlCreateEvent.channelid,
      chnlCreateEvent.accountcode,
      chnlCreateEvent.ticketid,
    );
  } catch (e) {
    throw new HttpErrors.InternalServerError(e);
  }
  logger.info('END -> assign owner to channel', {
    transactionid: `${transactionid}`,
    class: 'ChatopsKnightController',
    function: 'assignmentEventHandler',
  });
}

export async function fetchTicketDetailHandler(job) {
  const transactionid = job.data.transactionid;
  const accountConfig = job.data.accountConfig;
  const ticketId = job.data.ticketid;
  const ckRequest = job.data.ckRequest;
  const service = new ChatopsKnightProvider().value();
  msutils.logInfo(
    `${ticketId}:${accountConfig?.accountCode}:fetchTicket`,
    1,
    transactionid,
  );
  if (ticketId) {
    logger.info(`BEGIN ->  fetching Ticket detail`, {
      transactionid: `${transactionid}`,
      class: 'ChatOpsKnightController',
      function: 'fetchTicketDetailHandler',
    });
    const msgRequest: Object = {};
    msgRequest['callbackCK'] = true;
    msgRequest['ckRequest'] = ckRequest;
    try {
      logger.debug(`Fetching Ticket detail for ticketId:: ${ticketId}`, {
        transactionid: `${transactionid}`,
        class: 'ChatopsKnightController',
        function: 'fetchTicketDetailHandler',
      });
      const chatopsItsmUrl = await msutils.getMsUrl('chatopsItsm');
      await (
        await service
      ).getTicketDetails(
        chatopsItsmUrl,
        transactionid,
        accountConfig.accountCode,
        ticketId,
        msgRequest,
      );
    } catch (ex) {
      logger.error(ex);
    }

    logger.info('END ->  fetching Ticket detail', {
      transactionid: `${transactionid}`,
      class: 'ChatOpsKnightController',
      function: 'fetchTicketDetailHandler',
    });
  }
}
export async function updateTicketInChannelHandler(job) {
  const transactionid = job.data.transactionid;
  let accountCode = job.data.accountCode;
  const request = job.data.request;
  const dashboardStatus = job.data.dashboardStatus;
  const sourceCode = job.data.sourceCode;
  const service = new ChatopsKnightProvider().value();
  try {
    logger.info(
      `BEGIN ->  updating ticket detail in ChatOps for external  source : ${sourceCode}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatOpsKnightController',
        function: 'updateTicketInChannelHandler',
      },
    );

    let locators = {};
    if (accountCode) {
      request['isAccountOnboarded'] = true;
    } else {
      accountCode = sourceCode;
      locators = await msutils.getAccountCodeLocators(
        request.accountCodeLocators,
      );
      request['isAccountOnboarded'] = false;
    }

    const isAssignmentPresent = request.assignments?.length > 0;
    if (
      !request['isAccountOnboarded'] &&
      !isAssignmentPresent &&
      request.autoIndexChannelCreation
    ) {
      logger.warn(
        `ticketid:${request.ticket.ticketid}: Assignments not found in payload for non-onboarded SAT request. It will not be processed`,
        {
          transactionid,
          function: 'updateTicketInChannelHandler',
          class: 'ChatOpsKnighQueueHandler',
        },
      );
      return;
    }
    //delete request.accountCodeLocators;
    if (request?.information) {
      request.information['reportingSystemName'] = sourceCode;
    } else {
      request.information = {};
      request.information['reportingSystemName'] = sourceCode;
    }

    if (dashboardStatus) {
      request.ticket.dashboardstatus = dashboardStatus;
    }

    logger.info(
      `updating ticket for accountCode : ${accountCode} or locators : ${JSON.stringify(
        locators,
      )}`,
    );
    const imUrl = await msutils.getMsUrl('chatopsIncidentManager');
    await (
      await service
    ).updateTicketInChannel(
      imUrl,
      transactionid,
      accountCode,
      locators,
      request,
    );

    logger.info(
      `END ->  updated ticket detail in ChatOps for external source  : ${sourceCode}`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatOpsKnightController',
        function: 'updateTicketInChannelHandler',
      },
    );
  } catch (ex) {
    logger.error(
      `Error occured while  updated ticket detail in ChatOps for external source  : [${ex}]`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatOpsKnightController',
        function: 'updateTicketInChannelHandler',
      },
    );
    throw new HttpErrors.InternalServerError(ex);
  }
}

export async function fetchOpenTicketsHandler(job) {
  // const data = {
  //   accountCfg: accountCfg,
  //   transactionid: transactionid,
  //   chatopsSourceId: chatopsSourceId,
  //   isSync: isSync,
  //   config:config,
  //   request:GetOpenticketsForAccountRequest
  // };
  const transactionid = job.data.transactionid;
  const accountCfg = job.data.accountCfg;
  const request = job.data.request;
  // const ticketPriority = job.data.request.ticketPriority;
  // const ticketType = job.data.request.ticketType;
  const chatopsSourceId = job.data.chatopsSourceId;
  const isSync = job.data.isSync;

  const service = new ChatopsKnightProvider().value();
  let res;
  try {
    logger.info(`BEGIN ->  Fetching open ticket details `, {
      transactionid: `${transactionid}`,
      class: 'ChatOpsKnightController',
      function: 'fetchOpenTicketsHandler',
    });
    let accountCode = '';

    if (accountCfg) {
      accountCode = accountCfg.accountCode;
    }
    logger.info(`Fetching open tickets for accountCode : ${accountCode}`);
    const imUrl = await msutils.getMsUrl('chatopsIncidentManager');
    res = await (
      await service
    ).fetchOpenTicketInAccount(
      imUrl,
      transactionid,
      accountCode,
      chatopsSourceId,
      isSync,
      request,
    );

    logger.info(
      `END ->  fetching ticket detail in ChatOps for external source `,
      {
        transactionid: `${transactionid}`,
        class: 'ChatOpsKnightController',
        function: 'fetchOpenTicketsHandler',
      },
    );

    /** start metrics completed **/
    const metrics = job.data.metrics;
    metrics.stage = 'completed';
    msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
    /** end metrics completed **/
  } catch (ex) {
    logger.error(
      `Error occured while  fetching ticket detail in ChatOps for external source  : [${ex}]`,
      {
        transactionid: `${transactionid}`,
        class: 'ChatOpsKnightController',
        function: 'fetchOpenTicketsHandler',
      },
    );
    /** start metrics completed **/
    const metrics = job.data.metrics;
    metrics.stage = 'error';
    msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
    /** end metrics completed **/
    throw new HttpErrors.InternalServerError(ex);
  }
  return res;
}

export async function registerCustomerHandler(job) {
  const transactionid = job.data.transactionid;
  const request = job.data.updRequest;
  const chatopsknight = new ChatopsKnightProvider().value();
  const chatopsChanneleventUrl = await msutils.getMsUrl('chatopsChannelevent');
  const response = {};
  try {
    logger.info(`BEGIN ->  Register Customer `, {
      transactionid: `${transactionid}`,
      class: 'ChatOpsKnightController',
      function: 'registerCustomerHandler',
    });
    let channelId = '',
      customerName = '',
      sourceCfg = '';
    if (request?.msgRequest['commandType'] === 'app_mention') {
      channelId = request?.msgRequest.event.channel;
    } else {
      channelId = request?.msgRequest.channel_id;
    }
    customerName = request?.parameters['customername'];

    const res = await msutils.fetchFromStore('IncidentManager', {
      'channel.id': channelId,
    });
    if (res && res.length > 0) {
      response[
        'text'
      ] = `Channel ID: *${channelId}* is already registered as Incident Channel`;
    } else {
      const channeldocs = await msutils.fetchFromStore('ChannelDocs', {
        channelId: channelId,
      });

      const sourceSystemsData = await msutils.fetchFromStore(
        'SourceSystems',
        {},
      );
      if (sourceSystemsData) {
        sourceSystemsData.forEach((record) => {
          if (
            record.SourceIdentificationCode.toLowerCase() ===
            customerName.toLowerCase()
          ) {
            sourceCfg = record;
            customerName = record.SourceIdentificationCode;
          }
        });
      }

      if (channeldocs.length > 0 && channeldocs[0].linkedTo === customerName) {
        logger.info(
          `Channel ID: *${channelId}* is already registered to customer *${customerName}*`,
          {
            transactionid: transactionid,
            class: 'ChatopsKnightController',
            function: 'processRegisterCustCommand',
          },
        );

        response[
          'text'
        ] = `Channel ID: *${channelId}* is already registered to customer *${customerName}*`;
      } else {
        if (sourceCfg) {
          const channelDoc = {channelId: channelId, linkedTo: customerName};
          let result;

          if (channeldocs.length === 0)
            result = await msutils.saveInStore('ChannelDocs', channelDoc);
          else {
            result = await msutils.updateInStore(
              'ChannelDocs',
              channeldocs[0]._id,
              channelDoc,
            );
          }
          if (
            result.channelId === channelId &&
            result.linkedTo === customerName
          ) {
            response[
              'text'
            ] = `Succesfully registered channel with id *${channelId}* to customer *${customerName}*`;

            logger.info(
              `Document saved succesfully in db for channel with id  ${channelId} and customer ${customerName}`,
              {
                transactionid: `${transactionid}`,
                class: 'IncidentManagerInitiateHelper',
                function: 'initiate',
              },
            );
          }
        } else {
          logger.info(`Invalid customername`, {
            transactionid: transactionid,
            class: 'ChatopsKnightController',
            function: 'processRegisterCustCommand',
          });

          response['text'] = `No customer found with name as *${customerName}*`;
        }
      }
    }

    if (chatopsChanneleventUrl && response?.['text']) {
      await (
        await chatopsknight
      ).acknowledgeMessage(
        chatopsChanneleventUrl,
        transactionid,
        request.msgRequest,
        response,
      );
    }
    logger.info(`END ->  Register Customer `, {
      transactionid: `${transactionid}`,
      class: 'ChatOpsKnightController',
      function: 'registerCustomerHandler',
    });

    /** start metrics **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'processCommand',
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'register_customer',
      stage: 'completed',
    });
    /** end metrics **/
  } catch (ex) {
    logger.error(`Error occured while  registering customer  : [${ex}]`, {
      transactionid: `${transactionid}`,
      class: 'ChatOpsKnightController',
      function: 'registerCustomerHandler',
    });

    /** start metrics **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'processCommand',
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'register_customer',
      stage: 'error',
    });
    /** end metrics **/

    throw new HttpErrors.InternalServerError(ex);
  }
}
