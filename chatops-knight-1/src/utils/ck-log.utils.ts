import * as logger from 'winston';
import {v4 as uuidv4} from 'uuid';

export function logRequest(api, headers, params) {
  try {
    logger.info(`Request = ${api}`);
    logger.info(`headers = ${JSON.stringify(headers)}`);
    logger.info(`params = ${JSON.stringify(params)}`);
  } catch (err) {
    logger.warn('Failed to parse Request');
  }
}

export function validateTxID(request, params) {
  try {
    let txId =
      request.headers['transactionid'] ||
      request.headers['X-Transaction-Id'] ||
      request.headers['x-transaction-id'] ||
      'txid';
    console.log(params);
    const ticketId = params?.ticketId || params?.incidentid || params?.ticketid;
    if (ticketId) {
      txId = `${txId}-${uuidv4()}-${ticketId}`;
    } else {
      txId = `${txId}-${uuidv4()}-${ticketId}`;
    }

    request.headers['transactionid'] = txId;
    request.headers['X-Transaction-Id'] = txId;
    request.headers['x-transaction-id'] = txId;
    return request;
  } catch (err) {
    logger.warn('Failed to parse Request');
  }
}
