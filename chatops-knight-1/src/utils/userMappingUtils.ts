import * as logger from 'winston';
import * as msutils from 'msutils';
import {ChatopsKnightProvider} from '../services/chatops-knight.service';

export const getUserDataEventType = 'getUserDataEventType';

export async function getUserData(job) {
  const chatopsknight = new ChatopsKnightProvider().value();
  const chatopsChanneleventUrl = await msutils.getMsUrl('chatopsChannelevent');
  const transactionId = job.data.transactionid;
  const request = job.data.userInfoRequest;
  let emailId = job.data.email;
  let url, response;
  response = {
    text: `Failed to get the user info for email :- ${emailId}`,
  };
  if (emailId.includes('mailto')) {
    emailId = emailId.split('|');
    if (emailId.length > 0) {
      emailId = emailId[1]?.replace(/>/g, '');
    }
  }
  emailId = emailId.replace('kyndryl.com', 'ocean.ibm.com');
  try {
    const domainDetail = emailId.split('@')[1].toLowerCase();
    let oceanID, kyndrylId, ibmID, userNotes;
    if (domainDetail.includes('ocean')) {
      logger.info(`Processing API to fetch details for ocean ID`);
      url =
        'https://bluepages.ibm.com/BpHttpApisv3/slaphapi?ibmperson/(mail=' +
        emailId +
        ').search/byjson?preferredidentity&notesId&additional';
    } else {
      logger.info(`Processing API to fetch details for ibm ID`);
      url =
        'https://bluepages.ibm.com/BpHttpApisv3/slaphapi?ibmperson/(additional=*;' +
        emailId +
        ';*).search/byjson?preferredidentity&notesId&additional';
    }
    const restRequest = new msutils.DynamicRestCall(url, {}, 'GET', {
      'Content-Type': 'application/xml;charset=UTF-8',
    });
    // getting data from collab MS.
    const restResponse = await restRequest.call();
    if (
      restResponse?.data?.search?.entry &&
      restResponse.data.search.entry[0]?.attribute
    ) {
      const attrData = restResponse.data.search.entry[0]?.attribute;
      attrData.forEach(function (obj) {
        const preferredidentity =
          Object.values(obj).includes('preferredidentity');
        const notesId = Object.values(obj).includes('notesId');
        const additional = Object.values(obj).includes('additional');
        if (preferredidentity) {
          oceanID = obj.value[0];
          kyndrylId = oceanID.replace('ocean.ibm.com', 'kyndryl.com');
        }
        if (notesId) {
          userNotes = obj.value[0];
        }
        if (additional) {
          const splitAdditional = obj.value[0].split(';');
          ibmID = splitAdditional[1];
        }
      });
      response = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Hi,\nIBM to Kyndryl transition Data for:- ' + ibmID,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                'IBM Identity: ' +
                ibmID +
                '\nKyndryl Identity: ' +
                kyndrylId +
                '\nTransition Identity: ' +
                oceanID +
                '\nNotes ID: ' +
                userNotes,
            },
          },
          {
            type: 'divider',
          },
        ],
      };
    }
    if (chatopsChanneleventUrl && response) {
      await (
        await chatopsknight
      ).acknowledgeMessage(
        chatopsChanneleventUrl,
        transactionId,
        request.msgRequest,
        response,
      );
    }
    logger.error(`Returned Response for user info`);

    /** start metrics **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'processCommand',
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'userinfo',
      stage: 'completed',
    });
    /** end metrics **/
  } catch (e) {
    logger.error(`Error processing request for user info `);
    await (
      await chatopsknight
    ).acknowledgeMessage(
      chatopsChanneleventUrl,
      transactionId,
      request.msgRequest,
      response,
    );
    logger.error(`Returned Response for user info`);
    /** start metrics **/
    msutils.metricsQueueJobByJobType('updateMetricsFacts', {
      accountCode: 'default',
      api: 'processCommand',
      sourceSystem: 'default',
      microservice: 'internal',
      subFunction: 'default',
      service: 'default',
      command: 'userinfo',
      stage: 'error',
    });
    /** end metrics **/
  }
}
