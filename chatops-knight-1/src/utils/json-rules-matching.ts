import * as msutils from 'msutils';
import * as logger from 'winston';
import _ from 'lodash';

export class JsonRuleMatching {
  imDoc: object;
  accountCfg: object;
  ticketData: object;
  rules: string;
  type: string;
  chatopsSourceId: string;
  changedAttributes: Array<object>;
  conditionalOperator: object;
  currentTicketDetail: object;
  previousTicketDetail: object;
  currentTicketData: object;
  payloadToProcess: object;
  matchStatus: boolean;
  downgrade: boolean;
  mandatoryConditionValChanged: boolean;
  parsedRules: string;
  downgradeRules: string;
  updateChannelRules: string;

  constructor(
    imDoc: object,
    accountCfg: object,
    ticketData: object,
    rules: string,
    type: string,
    chatopsSourceId: string,
  ) {
    this.imDoc = imDoc[0];
    this.accountCfg = accountCfg;
    this.ticketData = ticketData;
    this.rules = rules;
    this.chatopsSourceId = chatopsSourceId;
    this.type = imDoc[0] ? 'update' : 'initiate';
    this.changedAttributes = [];
    this.conditionalOperator = {'&&': [], '||': [], finalCondition: ''};
    this.currentTicketDetail = {};
    this.previousTicketDetail = ticketData['previousData'];
    this.currentTicketData = ticketData['currentData'];
    this.payloadToProcess = {};
    this.matchStatus = false;
    this.downgrade = false;
    this.mandatoryConditionValChanged = false;
    this.parsedRules = rules;
    this.downgradeRules = accountCfg['businessRulesData']['downgradeRules'];
    this.updateChannelRules =
      accountCfg['businessRulesData']['updateChannelRules'];
  }

  async compareRules() {
    try {
      if (!this.currentTicketData) {
        await this.getTicketDetails();
      } else {
        await this.setCurrentTicketDetails();
      }
      await this.processRules();
      await this.processCondition();
      if (this.type === 'update') await this.processUpdateChannelRules();
      if (this.matchStatus) {
        logger.debug(`processing 1st condition`);
        await this.parseTicket();
      }
      //else {
      // if (this.type === 'update' && this.updateChannelRules?.length > 0) {
      //   logger.debug(`processing 2nd condition`);
      //   this.parsedRules = this.downgradeRules;
      //   await this.processDowngradeRules();
      // }
      // }
      return await this.returnPayload();
    } catch (err) {
      logger.debug(`Error at compareRules: ${err.message}`);
    }
  }

  async processUpdateChannelRules() {
    // "short_description,state,priority"
    // (('current.short_description'!='previous.short_description')or('current.state'!='previous.state'))
    logger.debug(`inside-processUpdateChannel-rules`);
    try {
      if (!this.updateChannelRules) {
        const fieldsToCheck = await msutils.fetchFromStore('settings', {
          config_name: 'updateChannelRulesDirectIntegration',
        });
        this.updateChannelRules = fieldsToCheck[0].config_value;
      }
      if (!this.matchStatus) {
        logger.debug(`if match status is false in processUpdateChannelRules`);
        this.downgrade = true;
        await this.parseTicket();
        return;
      }
      const updateControlAttributes = this.updateChannelRules.split(',');
      let updateRuleDefault = false;
      for (const i of updateControlAttributes) {
        const ruleMatch =
          this.currentTicketDetail[i] !== this.previousTicketDetail[i];
        if (ruleMatch) {
          logger.debug(`match status true for ${i}`);
          updateRuleDefault = true;
          break;
        }
      }
      logger.debug(`updateRuleDefault :: ${updateRuleDefault}`);
      this.matchStatus = updateRuleDefault;
    } catch (error) {
      logger.debug(`Error at processUpdateChannelRules: ${error.message}`);
    }
  }

  async returnPayload() {
    return {
      matchStatus: this.matchStatus,
      payloadToProcess: this.payloadToProcess,
    };
  }

  async processCondition() {
    const reg = new RegExp('=', 'g');
    this.parsedRules = this.parsedRules.replace(reg, '==');
    this.parsedRules = this.parsedRules.replace(/\and\b/g, '&&');
    this.parsedRules = this.parsedRules.replace(/\or\b/g, '||');
    logger.debug(`final condition::: ${this.parsedRules}`);
    this.matchStatus = eval(this.parsedRules);
  }

  // const str = "('current.priority'='1' OR 'CURRENT.INCIDENTPRIORITY'='2') OR ('CURRENT.INCIDENTIMPACT'='HIGH' OR 'CURRENT.INCIDENTIMPACT'='MAJOR')";
  //"('current.priority'='1') and ('current.short_description'!='previous.short_description')";
  // console.log(
  //   str.match(/CURRENT.\w*/g)
  // );
  async parseCurrentRules() {
    return this.parsedRules.match(/current.\w*/g);
  }

  async parsePreviousRules() {
    return this.parsedRules.match(/previous.\w*/g);
  }

  async matchAndReplace(matchKey, value) {
    const rule = this.parsedRules;
    value = value.toString();
    const isInt = value.match(/^\d+$/) !== null;
    const isDate =
      Date.parse(value).toString() !== 'NaN' &&
      value.includes(':') &&
      value.includes('-');
    if (isInt) {
      logger.debug(`inside isInt::: ${value}`);
      value = parseInt(value);
    } else if (isDate) {
      logger.debug('inside isDate');
      value = Date.parse(value);
    } else {
      logger.debug('inside else');
      value = value.length > 0 ? value.toString() : '';
    }
    logger.debug(`value:: ${value}`);
    const reg = new RegExp(matchKey, 'g');
    // const replacedRule = rule.replaceAll(matchKey, value);
    const replacedRule = rule.replace(reg, value);
    this.parsedRules = replacedRule;
  }

  async processCurrentData(allCurrentCondition) {
    const current = this.currentTicketDetail;
    logger.debug(`current::: ${JSON.stringify(current)}`);
    allCurrentCondition.forEach(async (element) => {
      const elementVal = eval(element);
      logger.debug(`elementVal:::: ${elementVal}`);
      await this.matchAndReplace(element, elementVal);
    });
  }

  async processPreviousData(allPreviousCondition) {
    const previous = this.previousTicketDetail;
    logger.debug(`previous::: ${JSON.stringify(previous)}`);
    allPreviousCondition.forEach(async (element) => {
      const elementVal = eval(element);
      logger.debug(elementVal);
      await this.matchAndReplace(element, elementVal);
    });
  }

  async processRules() {
    // const rules = this.rules;
    const allCurrentCondition = await this.parseCurrentRules();
    const allPreviousCondition = await this.parsePreviousRules();
    if (allCurrentCondition) await this.processCurrentData(allCurrentCondition);
    if (allPreviousCondition)
      await this.processPreviousData(allPreviousCondition);
  }

  async processDowngradeRules() {
    const allPreviousCondition = await this.parsePreviousRules();
    await this.processPreviousData(allPreviousCondition);
    if (this.parsedRules.includes('current')) {
      const allCurrentCondition = await this.parseCurrentRules();
      await this.processCurrentData(allCurrentCondition);
    }
    await this.processCondition();
    if (this.matchStatus) {
      this.downgrade = true;
      await this.parseTicket();
    }
  }

  async getAssignmentGroupName() {
    if (this.accountCfg['ticketToolUsed'] === 'icd') {
      return [this.ticketData['OWNERGROUP']['content']];
    } else {
      const link = this.ticketData['assignment_group']['link'];
      const token =
        'Basic ' +
        Buffer.from(
          msutils.decrypt(this.accountCfg['basicAuth']['username']) +
            ':' +
            msutils.decrypt(this.accountCfg['basicAuth']['password']),
        ).toString('base64');
      const headers = {Authorization: token};
      logger.debug(`link::: ${link}`);
      if (typeof link == 'string' && link?.length > 0) {
        const restRequest = new msutils.DynamicRestCall(
          link,
          '',
          'GET',
          headers,
        );
        const queueDetail = await restRequest.call();
        return [queueDetail['data']['result']['name']];
      } else {
        return [];
      }
    }
  }

  async parseIcd() {
    const updateEventRequest = {};
    const icdData = this.ticketData;
    updateEventRequest['eventid'] = icdData['TICKETID']['content'];
    updateEventRequest['ticketid'] = icdData['TICKETID']['content'];
    updateEventRequest['tickettype'] =
      icdData['CLASS']['content'] || 'Incident';
    updateEventRequest['ticketpriority'] = parseInt(
      icdData['INTERNALPRIORITY']?.content ||
        icdData['REPORTEDPRIORITY']?.content,
    );
    updateEventRequest['ticketdesc'] = icdData['DESCRIPTION']?.content || '';
    const impactMapping = this.accountCfg['businessRulesData']['impactMapping'];
    updateEventRequest['ticketimpact'] =
      impactMapping[icdData['IMPACT']?.content] || 'Low';
    updateEventRequest['ticketassignmentgroups'] =
      await this.getAssignmentGroupName();
    updateEventRequest['accountCode'] = this.accountCfg['accountCode'];
    updateEventRequest['accountCodeLocators'] = [
      {SearchKey: 'accountCode', SearchValue: this.accountCfg['accountCode']},
    ];
    const statusMapping =
      this.accountCfg['businessRulesData']['slimBrMsStatusMapping'];
    updateEventRequest['status'] =
      statusMapping[icdData['STATUS']?.content] || 'INPROGRESS';
    // updateEventRequest['statusdescription'] = icdData['DESCRIPTION']['content'];
    if (this.type === 'update') {
      updateEventRequest['channelid'] = this.imDoc['channel']['id'] || '';
      updateEventRequest['resolvetime'] =
        icdData['CHANGEDATE']['content'] || '';
      if (icdData['OWNER'])
        updateEventRequest['resolved_by'] = icdData['OWNER']?.content || '';

      if (this.downgrade) {
        updateEventRequest['status'] = 'DOWNGRADED';
        this.matchStatus = true;
      }
    }

    updateEventRequest['environment'] =
      this.accountCfg['businessRulesData']['environment'] || 'Dev';

    updateEventRequest['sourceidentificationcode'] = this.chatopsSourceId;

    this.payloadToProcess = updateEventRequest;
  }

  async parseSnow() {
    const updateEventRequest = {};
    updateEventRequest['eventid'] =
      this.ticketData['eventId'] || this.ticketData['number'];
    updateEventRequest['ticketid'] = this.ticketData['number'];
    // updateEventRequest['tickettype'] =
    //   this.ticketData['sys_class_name'] || 'Incident';
    updateEventRequest['tickettype'] =
      this.ticketData['ticketType'] || 'Incident';
    updateEventRequest['ticketpriority'] = parseInt(
      this.ticketData['priority'],
    );
    updateEventRequest['ticketdesc'] =
      this.ticketData['short_description'] || '';
    const impactMapping = this.accountCfg['businessRulesData']['impactMapping'];
    updateEventRequest['ticketimpact'] =
      impactMapping[this.ticketData['impact']] || 'Low';
    updateEventRequest['ticketassignmentgroups'] = [
      this.ticketData['assignment_group'],
    ];
    updateEventRequest['accountCode'] = this.accountCfg['accountCode'];
    updateEventRequest['isFetchDetailsRequired'] = true;
    updateEventRequest['accountCodeLocators'] = [
      {SearchKey: 'accountCode', SearchValue: this.accountCfg['accountCode']},
    ];
    const statusMapping =
      this.accountCfg['businessRulesData']['slimBrMsStatusMapping'];
    updateEventRequest['status'] =
      statusMapping[this.ticketData['state']] ||
      statusMapping[this.ticketData['incident_state']] ||
      'INPROGRESS';
    updateEventRequest['start_time'] = this.ticketData['sys_created_on'];
    updateEventRequest['last_updated_time'] = this.ticketData['sys_updated_on'];
    if (this.ticketData['work_notes']) {
      updateEventRequest['work_notes'] = this.ticketData['work_notes'];
    } else if (
      this.imDoc?.['request'] &&
      this.imDoc?.['request']['work_notes']
    ) {
      updateEventRequest['work_notes'] = this.imDoc['request']['work_notes'];
    }
    updateEventRequest['breach_time'] = this.ticketData['breach_time'] || '';
    updateEventRequest['reported_priority'] =
      this.ticketData['reported_priority'] || '';
    if (this.type === 'update') {
      updateEventRequest['channelid'] = this.imDoc['channel']['id'] || '';
      updateEventRequest['resolvetime'] = this.ticketData['resolved_at'] || '';
      updateEventRequest['resolved_by'] = this.ticketData['resolved_by'] || '';
      updateEventRequest['close_notes'] = this.ticketData['close_notes'] || '';
      // let andCondition = '(' + this.conditionalOperator['&&'].join('&&') + ')';
      // andCondition = eval(andCondition);
      // updateEventRequest['statusdescription'] =
      //   this.ticketData['short_description'];
      if (this.downgrade) {
        updateEventRequest['status'] = 'DOWNGRADED';
        this.matchStatus = true;
      }
    }

    updateEventRequest['environment'] =
      this.accountCfg['businessRulesData']['environment'] || 'Dev';

    updateEventRequest['sourceidentificationcode'] = this.chatopsSourceId;
    if (
      updateEventRequest['tickettype'] === 'execincident' &&
      this.ticketData['sys_id']
    ) {
      const incidentURL = `${this.accountCfg['instanceUrl']}/nav_to.do?uri=incident.do?sys_id=${this.ticketData['sys_id']}`;
      updateEventRequest['incident_url'] = incidentURL;

      if (this.ticketData['problem_id']) {
        const problemURL = `${this.accountCfg['instanceUrl']}/nav_to.do?uri=/problem.do?sys_id=${this.ticketData['problem_id']['value']}`;
        updateEventRequest['problem_id_url'] = problemURL;
        updateEventRequest['problem_id'] =
          this.previousTicketDetail['problem_id'];
      }
      updateEventRequest['has_breached'] =
        this.previousTicketDetail['has_breached'];
    }
    logger.debug(`updateEventRequest----${JSON.stringify(updateEventRequest)}`);
    this.payloadToProcess = updateEventRequest;
  }

  async parseSummit() {
    const updateEventRequest = {};
    updateEventRequest['eventid'] =
      this.ticketData['eventId'] || this.ticketData['Ticket_No'];
    updateEventRequest['ticketid'] = this.ticketData['Ticket_No'];
    updateEventRequest['tickettype'] =
      this.ticketData['Classification'] || 'Incident';
    const priorityMapping =
      this.accountCfg['businessRulesData']['priorityMapping'];
    updateEventRequest['ticketpriority'] =
      priorityMapping[this.ticketData['PriorityName']];
    updateEventRequest['ticketdesc'] = this.ticketData['Subject'] || '';
    const impactMapping = this.accountCfg['businessRulesData']['impactMapping'];
    updateEventRequest['ticketimpact'] =
      impactMapping[`${this.ticketData['Impact']}`] || 'Low';
    updateEventRequest['ticketassignmentgroups'] = [this.ticketData['WG_Name']];
    updateEventRequest['accountCode'] = this.accountCfg['accountCode'];
    updateEventRequest['isFetchDetailsRequired'] = true;
    updateEventRequest['accountCodeLocators'] = [
      {SearchKey: 'accountCode', SearchValue: this.accountCfg['accountCode']},
    ];
    const statusMapping =
      this.accountCfg['businessRulesData']['slimBrMsStatusMapping'];
    updateEventRequest['status'] =
      statusMapping[this.ticketData['Status']] || 'INPROGRESS';
    if (this.type === 'update') {
      updateEventRequest['channelid'] = this.imDoc['channel']['id'] || '';
      updateEventRequest['resolvetime'] =
        this.ticketData['Resolution_Time'] || '';
      updateEventRequest['resolved_by'] =
        this.ticketData['Assigned_Engineer_Email'] || '';
      // let andCondition = '(' + this.conditionalOperator['&&'].join('&&') + ')';
      // andCondition = eval(andCondition);
      // updateEventRequest['statusdescription'] =
      //   this.ticketData['short_description'];
      if (this.downgrade) {
        updateEventRequest['status'] = 'DOWNGRADED';
        this.matchStatus = true;
      }
    }

    updateEventRequest['environment'] =
      this.accountCfg['businessRulesData']['environment'] || 'Dev';

    updateEventRequest['sourceidentificationcode'] = this.chatopsSourceId;

    this.payloadToProcess = updateEventRequest;
  }

  async parseTicket() {
    if (this.accountCfg['ticketToolUsed'] === 'icd') {
      await this.parseIcd();
    } else if (this.accountCfg['ticketToolUsed'] === 'summit_ai') {
      await this.parseSummit();
    } else {
      await this.parseSnow();
    }
  }

  async parseSnowTicketData() {
    if (this.accountCfg['ticketToolUsed'] === 'service_now') {
      if (this.currentTicketData) {
        this.currentTicketDetail['assignment_group'] =
          this.currentTicketData['assignment_group'];
        this.ticketData['assignment_group'] =
          this.currentTicketData['assignment_group'];
        this.currentTicketDetail['assigned_to'] =
          this.currentTicketData['assigned_to'];
      } else {
        const assignmentGrpName = await this.getAssignmentGroupName();
        this.currentTicketDetail['assignment_group'] =
          this.ticketData['assignment_group']['value'];
        this.currentTicketDetail['assigned_to'] =
          this.ticketData['assigned_to']['value'];

        if (assignmentGrpName?.length > 0) {
          this.ticketData['assignment_group'] = assignmentGrpName[0];
        } else {
          this.ticketData['assignment_group'] = '';
        }
      }

      const statusMapping =
        this.accountCfg['businessRulesData']['slimBrMsStatusMapping'];
      this.currentTicketDetail['state'] =
        statusMapping[this.ticketData['state']] ||
        statusMapping[this.ticketData['incident_state']];

      if (this.ticketData['work_notes']) {
        const workNotes = this.ticketData['work_notes'].split('(Work notes)\n');
        this.ticketData['work_notes'] = workNotes[1];
        this.currentTicketDetail['work_notes'] = workNotes[1];
        this.previousTicketDetail['work_notes'] = '';
      }
    }
  }

  async parseSummitTicketData() {
    if (this.accountCfg['ticketToolUsed'] === 'summit_ai') {
      // DO nothing for now
    }
  }

  async parseICDResponse() {
    if (this.ticketData['TICKETID']['content'].length > 0) {
      const keys = Object.keys(this.ticketData);
      const newIcdTicketObj = {};
      keys.forEach((key) => {
        newIcdTicketObj[key] = this.ticketData[key]['content'];
      });
      this.currentTicketDetail = newIcdTicketObj;
    }
  }

  async setCurrentTicketDetails() {
    this.currentTicketDetail = this.currentTicketData;
    this.ticketData = this.currentTicketData;
  }

  async getTicketDetails() {
    if (!this.ticketData['number']) {
      const url = this.accountCfg['itsmServiceType'] + '/getTicketDetails';
      const body = {
        accountCode: this.accountCfg['accountCode'],
        ticketid: this.ticketData['ticketId'],
        msgRequest: {getOnlyTicketDetail: true},
      };
      const headers = {
        transactionid: `getticket-details-${this.accountCfg['accountCode']}`,
      };
      const restRequest = new msutils.DynamicRestCall(
        url,
        body,
        'POST',
        headers,
      );
      const ticketDetail = await restRequest.call();
      // console.log(`ticketDetailjson---${JSON.stringify(ticketDetail)}`);
      let data;
      if (ticketDetail?.data['ticketDetail']) {
        data = ticketDetail?.data['ticketDetail'];
        this.currentTicketDetail = data[0];
      }
      const ticketType = this.ticketData['ticketType'];
      const workNotes = this.ticketData['previousData']['work_notes'];
      const breachTime = this.ticketData['previousData']['breach_time'];
      const reportedPriority =
        this.ticketData['previousData']['reported_priority'];

      this.ticketData = data[0];
      if (ticketType) {
        this.ticketData['ticketType'] = ticketType;
        if (workNotes) {
          this.ticketData['work_notes'] = workNotes;
        }
        if (breachTime) {
          this.ticketData['breach_time'] = breachTime;
        }
        if (reportedPriority) {
          this.ticketData['reported_priority'] = reportedPriority;
        }
      }

      const icdTicketType = this.accountCfg['businessRulesData']['ticketType'];
      // console.log(`this.TicketData::: ${JSON.stringify(data[0])}`);
      if (this.accountCfg['ticketToolUsed'] === 'icd') {
        if (
          this.accountCfg['apiUrls'] &&
          this.accountCfg?.['apiUrls']?.['getticketdetail']?.['payloadKey']
        ) {
          const payloadKey =
            this.accountCfg['apiUrls']['getticketdetail']['payloadKey'];
          const incident = _.get(data[0], payloadKey, '');
          this.ticketData = incident[0]['Attributes'];
        } else {
          if (data[0][`${icdTicketType}MboSet`][`${icdTicketType}`])
            this.ticketData =
              data[0][`${icdTicketType}MboSet`][`${icdTicketType}`][0][
                'Attributes'
              ];
        }

        // console.log(`this.TicketData::: ${JSON.stringify(this.ticketData)}`);
        await this.parseICDResponse();
      } else if (this.accountCfg['ticketToolUsed'] === 'summit_ai') {
        await this.parseSummitTicketData();
      } else {
        await this.parseSnowTicketData();
      }
    }
  }

  // async ticketChangedCheck() {
  //   if (this.type === 'initiate') return [];
  //   const rulesKeys = Object.keys(this.rules);
  //   const arr: Array<boolean> = [];
  //   for (const rule of rulesKeys) {
  //     const matchCond =
  //       this.ticketData[rule] === this.previousTicketDetail[rule];
  //     arr.push(matchCond);
  //   }
  //   if (!arr.includes(false)) {
  //     this.matchStatus = false;
  //   }
  // }
}
