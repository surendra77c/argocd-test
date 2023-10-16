import {AccountCodeLocator} from './accountcodelocator.model';
import {property, model} from '@loopback/repository';
import {TicketParams} from './ticketParams.model';
import {
  InformationParams,
  //AdditionalProperties,
} from './informationParams.model';
// import {AssignmentEmails, NotificationEmails} from './assignmentEmails.model';
import {ChannelParams} from './channelParams.model';
@model()
export class UpdateTicketInChannelRequest {
  @property.array(AccountCodeLocator, {optional: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  ticket: TicketParams;
  @property({
    optional: true,
  })
  additionalProperties?: Object;
  @property({optional: true})
  information?: InformationParams;
  @property({optional: true})
  channelConfig: ChannelParams;
  @property({optional: true})
  callbackUrl?: string;
  @property.array('string', {optional: true})
  assignments?: string[];
}
