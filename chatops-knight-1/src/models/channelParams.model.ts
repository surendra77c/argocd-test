import {model, property} from '@loopback/repository';
import {AssignmentEmails} from './assignmentEmails.model';

@model()
export class ChannelParams {
  @property({type: 'boolean', default: false, optional: true})
  createTicketChannel?: boolean;
  @property.array(AssignmentEmails, {optional: true})
  assignmentEmails?: AssignmentEmails[];
  @property({type: 'boolean', default: false, optional: true})
  allowFutureUpdates?: boolean;
}
