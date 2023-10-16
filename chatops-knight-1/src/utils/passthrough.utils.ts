import * as logger from 'winston';
import * as msutils from 'msutils';
import {HttpErrors} from '@loopback/rest';
import {PassThroughProvider} from '../services';
import {KNIGHT_CONSTANTS} from '../utils/chatops-knight-constants';
import {PassthroughRequest} from '../models/passthroughRequest.model';

export async function PassThroughRequestProcess(job) {
  logger.info('Processing pass through api data');
  const configData = job.data;
  // let accountCfg;
  const accountCfg = configData?.accountCfg;
  // const accountCodeLocators = configData.passThroughAction?.accountCodeLocators;
  // if (accountCodeLocators) {
  //   accountCfg = await msutils.getAccountByLocator(accountCodeLocators);
  //   if (!accountCfg) {
  //     throw new HttpErrors.BadRequest(
  //       `Account ${accountCodeLocators} is not onboarded`,
  //     );
  //   }
  // }
  let retRes;
  // await validateAndGetConfig(authData, configData, accountCfg);
  if (accountCfg?.accountCode) {
    retRes = await processWithAccountLocators(configData, accountCfg);
    return retRes;
  } else {
    retRes = await processWithoutAccountLocators(configData, accountCfg);
    return retRes;
  }
}

export function reStructurePassThroughReq(syncpassThroughReq) {
  const req: PassthroughRequest = {
    method: syncpassThroughReq?.method,
    uri: syncpassThroughReq?.uri,
    requestType: syncpassThroughReq?.requestType,
    passThroughHeaders: syncpassThroughReq?.passThroughHeaders,
    passThroughPayload: syncpassThroughReq?.passThroughPayload,
  };
  syncpassThroughReq.passThroughRequest = req;
  return syncpassThroughReq;
}

async function processRequests(url, configData, accountCfg) {
  const passThroughRequestData =
    configData.passThroughAction?.passThroughRequest;
  const passThroughResponseData =
    configData.passThroughAction?.passThroughCallback;
  const body = passThroughRequestData.passThroughPayload;
  const method = passThroughRequestData.method;
  const headers = passThroughRequestData.passThroughHeaders;
  const restRequest = new msutils.DynamicRestCall(url, body, method, headers);
  // getting data from collab MS.
  const restResponse = await restRequest.call();
  const parsedResponse = restRequest.parseResponse(restResponse);
  // console.log('passThroughResponseData inside processRequests', parsedResponse);
  parsedResponse.returnData = passThroughResponseData?.returnData;
  if (!configData?.passThroughAction?.isSync) {
    const callbackMethod = passThroughResponseData.method || 'POST';
    const callbackRequest = new msutils.DynamicRestCall(
      passThroughResponseData.callbackUrl,
      parsedResponse,
      callbackMethod,
      passThroughResponseData.callbackHeaders,
    );
    await callbackRequest.call();
    return true;
  }
  logger.info(parsedResponse);
  const metrics = configData.metrics;
  metrics['stage'] = 'completed';
  msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
  return parsedResponse;
}

async function processWithAccountLocators(configData, accountCfg) {
  logger.info('processing With AccountLocators');
  const requestType =
    configData.passThroughAction?.passThroughRequest?.requestType;
  const passThroughRequestData =
    configData.passThroughAction?.passThroughRequest;
  const passThroughReq = new PassThroughProvider().value();
  let url = accountCfg.itsmServiceType;
  let retRes;
  if (
    accountCfg.itsmMSEnabled &&
    (requestType === 'service_now' || requestType === 'icd')
  ) {
    try {
      const isSync = configData.passThroughAction?.isSync ? true : false;
      retRes = await (
        await passThroughReq
      ).callItsmService(
        url,
        configData.transactionid,
        accountCfg.accountCode,
        configData.passThroughAction,
        isSync,
      );
    } catch (err) {
      logger.error(`Error at processWithAccountLocators: ${err}`);
    }
  } else if (requestType === 'chatops') {
    logger.info('inside chatops flow');
    const collabUrl = await msutils.getMsUrl('chatopsCollab');
    url = collabUrl + passThroughRequestData.uri;
    retRes = await processRequests(url, configData, accountCfg);
  } else if (requestType === KNIGHT_CONSTANTS.ANSIBLE_TYPE) {
    logger.info('inside ansible flow');
    retRes = await ansiblePassThrough(configData, accountCfg);
  } else {
    retRes = await processWithoutAccountLocators(configData, accountCfg);
  }
  return retRes;
}

async function processWithoutAccountLocators(configData, accountCfg) {
  logger.info('processing the request without account code locators');

  const passThroughRequestData =
    configData.passThroughAction?.passThroughRequest;

  const url = passThroughRequestData.uri;
  const requestType =
    configData.passThroughAction?.passThroughRequest?.requestType;
  let retRes;
  logger.info('requestType inside without account locator', requestType);
  if (requestType === KNIGHT_CONSTANTS.ANSIBLE_TYPE) {
    logger.info('I am inside ANSIBLE_TYPE');
    // console.log('I am inside ANSIBLE_TYPE', configData);
    retRes = await ansiblePassThrough(configData);
    return retRes;
  }
  retRes = await processRequests(url, configData, accountCfg);
  return retRes;
}

/**
 * validates for transactionid and gets the config
 * @param transactionid
 * @param accountCode
 */

export async function validateAndGetConfig(authData, configData, accountCfg) {
  const passThroughAction = configData.passThroughAction;
  const chatopsSourceId = authData.chatopsSourceId;
  const chatopsSourceAPIToken = authData.chatopsSourceAPIToken;
  const apiName = authData.apiName;
  const keyName = authData.keyName;
  const transactionId = configData.transactionid;
  const accountCode = accountCfg?.accountCode ? accountCfg?.accountCode : '';
  logger.info(`validate config for accountCode: ${accountCode}`);
  if (!transactionId) {
    throw new HttpErrors.BadRequest(
      `transactionid in the request header must be defined and should have value.`,
    );
  }
  const sourceCfg = await msutils.findSourceSystem(chatopsSourceId);
  const accountActiveStatus = await msutils.checkIfAccountActive(accountCfg);
  if (accountActiveStatus?.gracefullExit) {
    return true;
  }
  if (sourceCfg) {
    //validate the payload for valid authentication for source systems
    const response = await msutils.validatePayload(
      chatopsSourceAPIToken,
      passThroughAction,
      chatopsSourceId,
      apiName,
      keyName,
      accountCode,
    );
    if (!response) {
      throw new HttpErrors.BadRequest(`Invalid ChatOps Source ID or Token`);
    } else {
      logger.info(`Valid ChatOps Source ID -> ${chatopsSourceId}`);
    }
  } else {
    logger.error(`Invalid ChatOps Source ID -> ${chatopsSourceId}`, {
      transactionid: `${transactionId}`,
      class: 'CollaboratorController',
      function: 'postMessageToChannel',
    });
    throw new HttpErrors.BadRequest(`Invalid ChatOps Source ID`);
  }
}

export async function ansiblePassThrough(parameters, accountCfg = {}) {
  logger.info('inside ansiblePassThrough');
  const ansibleUrl = await msutils.getMsUrl('chatopsAnsibleIntegration');
  const subRoute =
    Object.keys(accountCfg).length > 0
      ? KNIGHT_CONSTANTS.ANSIBLE_WITH_ACCOUNT
      : KNIGHT_CONSTANTS.ANSIBLE_WITH_OUT_ACCOUNT;
  logger.info(`calling ${subRoute}`);
  const url = ansibleUrl + subRoute;
  // const retRes;
  // console.log('parameters before ansible process', parameters);
  const retRes = await ansibleProcessRequests(url, {parameters}, accountCfg);
  return retRes;
}

async function ansibleProcessRequests(url, parameters, accountCfg) {
  logger.info('inside ansibleProcessRequests');
  // console.log('inside ansibleProcessRequests', parameters);
  const configData = parameters.parameters;
  parameters.accountCfg = accountCfg;
  const passThroughResponseData =
    configData.passThroughAction?.passThroughCallback;
  const method = passThroughResponseData?.method
    ? passThroughResponseData?.method
    : KNIGHT_CONSTANTS.POST_METHOD;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const restRequest = new msutils.DynamicRestCall(
    url,
    parameters,
    KNIGHT_CONSTANTS.POST_METHOD,
    headers,
  );
  const restResponse = await restRequest.call();
  const parsedResponse = restRequest.parseResponse(restResponse);
  parsedResponse['returnData'] = passThroughResponseData?.returnData;
  // console.log('configData?.passThroughAction', configData?.passThroughAction);
  if (!configData?.passThroughAction?.isSync) {
    const callbackRequest = new msutils.DynamicRestCall(
      passThroughResponseData.callbackUrl,
      parsedResponse,
      method,
      passThroughResponseData.callbackHeaders,
    );
    await callbackRequest.call();
  }
  logger.info(parsedResponse);
  // console.log(parsedResponse);
  logger.info('ansibleProcessRequests completed');
  const metrics = configData.metrics;
  metrics['stage'] = 'completed';
  msutils.metricsQueueJobByJobType('updateMetricsFacts', metrics);
  return parsedResponse;
}
