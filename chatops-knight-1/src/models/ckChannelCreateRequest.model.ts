import {AccountCodeLocator} from './accountcodelocator.model';
import {model, property, Model} from '@loopback/repository';

@model()
export class ChatopsKnightChannelCreateRequest extends Model {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({optional: true})
  eventid: string;
  @property({required: true})
  incidentid: string;
  @property({optional: true})
  incidenttype: string;
  @property({required: true})
  incidentpriority: number;
  @property({required: true})
  incidentdesc: string;
  @property({optional: true})
  incidentimpact?: string;
  @property({required: true})
  environment: string;
  @property.array(String, {optional: true})
  incidentassignmentgroups: string[]; // These groups will be assigned via assignment service after finding actual resources of each group
  @property({optional: true})
  callbackaddress?: string; // This is the call back URL
  @property({optional: true})
  channelCreateRequest?: Object; // This is for slack's createchannel Callback
}

@model()
export class ChatopsKnightTicketChannelCreateRequest extends Model {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({optional: true})
  eventId: string;
  @property({required: true})
  ticketId: string;
  @property({optional: true})
  ticketType: string;
  @property({required: true})
  ticketPriority: number;
  @property({required: true})
  ticketDesc: string;
  @property({optional: true})
  ticketImpact?: string;
  @property({required: true})
  environment: string;
  @property.array(String, {optional: true})
  ticketAssignmentGroups: string[]; // These groups will be assigned via assignment service after finding actual resources of each group
  @property({optional: true})
  additionalProperties?: Object;
  @property({optional: true})
  callbackAddress?: string; // This is the call back URL
  @property({optional: true})
  channelCreateRequest?: Object; // This is for slack's createchannel Callback
  @property({optional: true})
  status?: string;
}

@model()
export class ProcessCommandRequest {
  @property({required: true})
  accountCode: string;
  @property({required: true})
  msgRequest: Object;
  @property({required: true})
  parameters: Object;
}

@model()
export class ResponseObject {
  @property({required: true})
  success: boolean;
  @property.array(String, {required: true})
  errorMessage: String[];
}
