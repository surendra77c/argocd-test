import * as logger from 'winston';
import * as msutils from 'msutils';
import * as HttpErrors from 'http-errors';
import {JsonRuleMatching} from './json-rules-matching';
import {
  CKCreateIncQueue,
  createChannelType,
  registerHandler,
  // updateChatOpsIncidentEventType,
  validateDuplicateRequest,
  fetchTicketDetailType,
} from '../utils/chatops-knight-utils';

export async function dashboardStatusMap(sourceCfg, updateEventRequest) {
  let sourceIncidentStatusCfg;
  let checkDefaultStatus = false;

  if (
    !(updateEventRequest !== undefined && updateEventRequest['status'] === '')
  ) {
    if (sourceCfg?.IncidentStatusMap) {
      const stat = updateEventRequest['status'];
      sourceIncidentStatusCfg = sourceCfg.IncidentStatusMap.find(
        (status) => status.SourceStatus.toUpperCase() === stat?.toUpperCase(),
      );

      if (sourceIncidentStatusCfg) {
        updateEventRequest['status'] = sourceIncidentStatusCfg.IMStatus || '';
        if (!updateEventRequest['statusdescription']) {
          updateEventRequest['statusdescription'] =
            sourceIncidentStatusCfg.Description || '';
        }
      } else {
        checkDefaultStatus = true;
      }
    } else {
      checkDefaultStatus = true;
    }

    if (checkDefaultStatus) {
      sourceCfg = await msutils.findSourceSystem('DEFAULT');
      logger.debug(`statusbefore---${updateEventRequest['status']}`);
      updateEventRequest['status'] = updateEventRequest['status'].replace(
        / +/g,
        '',
      );
      logger.debug(`statusafter---${updateEventRequest['status']}`);
      sourceIncidentStatusCfg = sourceCfg.IncidentStatusMap.find(
        (status) =>
          status.SourceStatus.toUpperCase() ===
          updateEventRequest['status'].toUpperCase(),
      );
      if (sourceIncidentStatusCfg) {
        updateEventRequest['status'] = sourceIncidentStatusCfg.IMStatus;
        if (!updateEventRequest['statusdescription']) {
          updateEventRequest['statusdescription'] =
            sourceIncidentStatusCfg.Description;
        }
        updateEventRequest['dashboardStatus'] =
          sourceIncidentStatusCfg.DashboardValue;
      } else {
        logger.error(
          `Following input parameter must have a valid value status`,
        );
        throw new HttpErrors.BadRequest(
          `Following input parameter must have a valid value -> status`,
        );
      }
    }
  }
  return updateEventRequest;
}

export async function directIntegrationHandler(job) {
  logger.info('Processing directIntegrationHandler data');
  const ticketData = job.data.getTicketDetailsRequest;
  const accountCfg = job.data.accountCfg;
  const transactionid = job.data.transactionid;
  const chatopsSourceId = job.data.chatopsSourceId;
  const config = job.data.config;
  const cacheKey = ticketData.accountCode + ticketData.ticketId;
  try {
    registerHandler();
    const channelDetail = await msutils.fetchFromStore('IncidentManager', {
      'request.ticketid': ticketData.ticketId,
      'request.accountCode': ticketData.accountCode,
    });
    if (channelDetail?.length === 0) {
      const crtRequest = {ticketid: ticketData.ticketId};
      const validDupReq = await validateDuplicateRequest(
        crtRequest,
        accountCfg,
      );
      if (!validDupReq.success) {
        logger.error(`Error: ${validDupReq.errorMessage}`);
        throw new HttpErrors.BadRequest(`${validDupReq.errorMessage}`);
      }
    }
    const proceedWithProcess = await validateBusinessRuleTriggerCondition(
      accountCfg,
      ticketData,
      channelDetail,
      chatopsSourceId,
    );
    const sourceCfg = await msutils.findSourceSystem(chatopsSourceId);
    logger.debug(`channelDetail:${channelDetail}`);
    const payload = {
      payloadToProcess: proceedWithProcess?.payloadToProcess ?? {},
      matchStatus: proceedWithProcess?.matchStatus ?? false,
    };
    if (!proceedWithProcess?.matchStatus) {
      logger.debug(`cacheKey [${cacheKey}]`, {
        transactionid: `${transactionid}`,
        class: 'BusinessRule',
        function: 'directIntegrationHandler',
      });
      await msutils.delCacheValue(cacheKey);
      const cacheKeyDuplicate = cacheKey + 'directIntegration';
      await msutils.delCacheValue(cacheKeyDuplicate);
    }
    if (proceedWithProcess?.matchStatus) {
      let updateEventRequest = payload?.payloadToProcess;
      updateEventRequest = await dashboardStatusMap(
        sourceCfg,
        updateEventRequest,
      );

      msutils.logInfo(
        `${ticketData.ticketId}:${accountCfg?.accountCode}:directIntegration`,
        3,
        transactionid,
      );

      if (channelDetail?.length > 0) {
        logger.debug('update request processing');
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          fetchTicketDetailType,
          {
            accountConfig: accountCfg,
            transactionid: transactionid,
            ticketid: ticketData.ticketId,
            config: config,
            ckRequest: updateEventRequest,
          },
          config.JobQueue.Options,
        );
        msutils.metricsQueueJobByJobType('updateMetricsFacts', {
          accountCode: accountCfg?.accountCode,
          api: 'updateTicket',
          sourceSystem: chatopsSourceId,
          microservice: 'ext-proxy',
          subFunction: 'directIntegration',
          service: 'default',
          command: 'default',
          stage: 'validated',
        });
      } else {
        logger.debug('initiate request processing');
        msutils.queueJobByJobType(
          CKCreateIncQueue,
          createChannelType,
          {
            accountCfg: accountCfg,
            transactionid: transactionid,
            crtRequest: updateEventRequest,
            sourceidentificationcode: chatopsSourceId,
          },
          config.JobQueue.Options,
        );
        msutils.metricsQueueJobByJobType('updateMetricsFacts', {
          accountCode: accountCfg?.accountCode,
          api: 'initiateTicket',
          sourceSystem: chatopsSourceId,
          microservice: 'ext-proxy',
          subFunction: 'directIntegration',
          service: 'default',
          command: 'default',
          stage: 'validated',
        });
      }
    } else {
      logger.debug(
        `Rejecting Service now ticket Number ${ticketData.ticketId} ${ticketData.number}. Did not met the condition.`,
      );
    }
  } catch (err) {
    logger.debug(`cacheKey-Error [${cacheKey}]`, {
      transactionid: `${transactionid}`,
      class: 'BusinessRule',
      function: 'directIntegrationHandler',
    });
    // const cacheKey = ticketData.accountCode + ticketData.ticketId;
    await msutils.delCacheValue(cacheKey);
    logger.error(err.message);
  }
}

async function validateBusinessRuleTriggerCondition(
  accountCfg,
  ticketData,
  imDoc,
  chatopsSourceId,
) {
  let rules = accountCfg.businessRulesData.rules;

  const commaRuleFieldsList = await msutils.fetchSettings(
    'TriggerRulesFieldsForCommaSeparate',
  );

  if (commaRuleFieldsList.length > 0) {
    rules = await rulesQueryDecoder(`(${rules})`, commaRuleFieldsList); //  FUNCTION USED TO SPLIT COMMA SEPARATED CONDITION TO INDIVIDUAL CONDITION
  }

  const type = imDoc?.length > 0 ? 'update' : 'initiate';
  const rulesStatus = new JsonRuleMatching(
    imDoc,
    accountCfg,
    ticketData,
    rules,
    type,
    chatopsSourceId,
  );
  const matchStatus = await rulesStatus.compareRules();
  logger.debug(`matchStatus:${JSON.stringify(matchStatus)}`);
  return matchStatus;
}

function iterateVals(str) {
  const fields = new Set();

  str = str.map((value) => {
    if (
      Array.isArray(value) &&
      value.length === 1 &&
      typeof value[0] === 'string'
    ) {
      value = value[0];
    }

    if (
      Array.isArray(value) &&
      value.length === 1 &&
      Array.isArray(value[0]) &&
      typeof value[0][0] === 'string'
    ) {
      value = value[0][0];
    }

    if (Array.isArray(value)) {
      const res = iterateVals(value);

      return {
        combinator: value[1] || 'and',
        rules: res,
      };
    }

    if (typeof value === 'string' && value !== '') {
      if (['and', 'or'].indexOf(value) !== -1) {
        str.combinator = value;
      } else {
        let operatorType =
          value.indexOf('!==') !== -1
            ? '!=='
            : value.indexOf('==') !== -1
            ? '=='
            : value.indexOf('!=') !== -1
            ? '!='
            : '=';

        const splitVals = value.split(operatorType);
        const part1 = splitVals[0] || '';
        let part2 = splitVals[1] || '';

        if (part2.indexOf('previous.') !== -1) {
          operatorType = operatorType === '=' ? 'contains' : 'doesNotContain';
        }

        fields.add(part1);
        if (part2 !== '')
          part2 = part2.replace(new RegExp('%20', 'g'), () => ' ');
        return {
          field: part1,
          value: part2,
          operator: operatorType,
        };
      }
    }

    return value;
  });

  return str;
}

function filterValues(rules) {
  rules = rules.filter((value) => {
    if (typeof value === 'string' && ['and', 'or'].indexOf(value) !== -1) {
      return false;
    }

    if (value?.rules) {
      value.rules = filterValues(value.rules);
      return true;
    }

    return true;
  });

  return rules;
}

function splitCommaSeparatedVals(rules, commaRuleFieldsList) {
  rules = rules.map((values) => {
    const {field = undefined, value = undefined, operator = undefined} = values;

    if (values?.rules) {
      values.rules = splitCommaSeparatedVals(values.rules, commaRuleFieldsList);
    }

    if (field && value && operator && value.indexOf(',') !== -1) {
      let rulesValArray = [value];
      const fieldName = field.split('.')[1];

      if (commaRuleFieldsList.indexOf(fieldName) !== -1) {
        rulesValArray = value.split(',');
      }

      const rulesArray: [object] = [{}];

      for (const paramVal of rulesValArray) {
        rulesArray.push({
          field,
          operator,
          value: paramVal.trim() || '',
        });
      }

      rulesArray.shift();

      return {
        combinator: 'or',
        rules: rulesArray,
      };
    }

    return values;
  });

  return rules;
}

//  MAP QUERYBUILDER OPERATORS WITH QUERY
const mapValues = (ruleMap) => {
  let response = [];
  response =
    ruleMap?.rules.map((param) => {
      const {id, field, combinator, rules} = param;
      let {operator, value} = param;

      switch (operator) {
        case '=':
        case '==':
          operator = '=';
          break;
        case '!=':
        case '!==':
          operator = '!=';
          break;
        case 'in':
          operator = '==';
          break;
        case 'not in':
          operator = '!==';
          break;
        case 'contains':
          operator = '=';
          break;
        case 'doesNotContain':
          operator = '!=';
          break;
        case 'null': {
          operator = '=';
          value = null;
          break;
        }
        case 'notNull': {
          operator = '!=';
          value = null;
          break;
        }
      }

      if (field) return `('${field}'${operator}'${value}')`;
      if (rules && rules?.length !== 0)
        return `${mapValues({id, combinator, rules})}`;

      return '';
    }) || '';

  return `(${response.join(ruleMap?.combinator)})`;
};

const rulesQueryDecoder = async (str, commaRuleFieldsList) => {
  try {
    str = `${str}`;

    str = str
      .split('')
      .map((val) => ([' ', '\n'].indexOf(val) !== -1 ? '%20' : val))
      .join('')
      .replace(/\s/g, '');
    str = str
      .replace(/[(]/g, ' [') //.replace(new RegExp('(', 'g'), () => ' [')
      .replace(/[)]/g, '] ') //.replace(new RegExp(')', 'g'), () => '] ')
      .replace(new RegExp(' and ', 'g'), () => " 'and' ")
      .replace(new RegExp(' or ', 'g'), () => " 'or' ")
      .replace(new RegExp('%20and%20', 'g'), () => " 'and' ")
      .replace(new RegExp('%20or%20', 'g'), () => " 'or' ")
      .replace(new RegExp("'='", 'g'), () => '=')
      .replace(new RegExp("'!='", 'g'), () => '!=')
      .replace(new RegExp("'=='", 'g'), () => '==')
      .replace(new RegExp("'!=='", 'g'), () => '!==');

    str = str.replace(new RegExp("'", 'g'), () => '*');
    str = str.replace(/\*([^*]+)\*/g, "['$1']");
    str = str
      .split('')
      .map((val) => ([' ', '\n'].indexOf(val) !== -1 ? '' : val))
      .join('')
      .replace(/\s/g, '');
    str = str.replace(/\]\[/g, '],['); //str.replace(new RegExp('][', 'g'), () => '],[');
    str = str.replace(/\]and\[/g, "],['and'],["); //str.replace(new RegExp(']and[', 'g'), () => "],['and'],[");
    str = str.replace(/\]or\[/g, "],['or'],["); //str.replace(new RegExp(']or[', 'g'), () => "],['or'],[");

    str = str
      .split('')
      .map((val, index) => {
        const condition1 =
          val === ',' && str[index - 1] === ']' && str[index + 1] === ']';
        const condition2 = val === ',' && str[index + 1] === undefined;

        if (condition1 || condition2) return '';
        if (val === "'") return '"';
        return val;
      })
      .join('');

    str = str.replace(new RegExp('%20', 'g'), () => ' ');
    str = JSON.parse(str);

    const res2 = iterateVals(str);

    const object2 = {
      rules: [],
      combinator: '',
    };

    object2.rules = res2;
    object2.combinator = res2[1] || '';

    object2.rules = filterValues(object2.rules);
    object2.rules = await splitCommaSeparatedVals(
      object2.rules,
      commaRuleFieldsList,
    );

    const parseJSONQuery = JSON.parse(JSON.stringify(object2));

    let rulesQuery = mapValues(parseJSONQuery);
    rulesQuery = rulesQuery.substring(1, rulesQuery.length - 1);

    return rulesQuery;
  } catch (error) {
    return `{
            combinator: 'and',
            rules: [],
        }`;
  }
};
