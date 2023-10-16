import {AccountCodeLocator} from './accountcodelocator.model';
import {FilterTicketParameter} from './ckOpenTicketParameter.model';
import {property, model} from '@loopback/repository';

@model()
export class UpdateChatOpsIncidentEventRequest {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  eventid: string;
  @property({required: true})
  incidentid: string;
  @property({required: true})
  incidenttype: string;
  @property({required: true})
  incidentpriority: number;
  @property({required: true})
  incidentdesc: string;
  @property({optional: true})
  incidentimpact?: string;
  @property({required: true})
  environment: string;
  @property.array(String, {required: true})
  incidentassignmentgroups: string[]; // These groups will be assigned via assignment service after finding actual resources of each group
  @property({required: true})
  status: string;
  @property({required: true})
  statusdescription: string;
  @property({required: true})
  channelid: string;
}

@model()
export class UpdateIncidentRequest {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  eventid: string;
  @property({required: true})
  incidentid: string;
  @property({optional: true})
  incidenttype?: string;
  @property({required: true})
  incidentpriority: number;
  @property({required: true})
  incidentdesc: string;
  @property({optional: true})
  incidentimpact?: string;
  @property({required: true})
  environment: string;
  @property.array(String, {optional: true})
  incidentassignmentgroups?: string[]; // These groups will be assigned via assignment service after finding actual resources of each group
  @property({required: true})
  status: string;
  @property({required: true})
  statusdescription: string;
  @property({optional: true})
  channelid?: string;
  @property({optional: true})
  incidentDetail?: Object;
  @property({optional: true})
  resolver?: string;
  @property({optional: true})
  resolvetime?: string;
  @property({optional: true})
  isFetchDetailsRequired?: boolean;
}

@model()
export class UpdateTicketRequest {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  eventId: string;
  @property({required: true})
  ticketId: string;
  @property({optional: true})
  ticketType?: string;
  @property({optional: true})
  ticketPriority?: number;
  @property({optional: true})
  ticketDesc?: string;
  @property({optional: true})
  ticketImpact?: string;
  @property({required: true})
  environment: string;
  @property.array(String, {optional: true})
  ticketAssignmentGroups?: string[]; // These groups will be assigned via assignment service after finding actual resources of each group
  @property({required: true})
  status: string;
  @property({optional: true})
  statusDescription?: string;
  @property({optional: true})
  channelId?: string;
  @property({optional: true})
  ticketDetail?: Object;
  @property({optional: true})
  resolver?: string;
  @property({optional: true})
  resolveTime?: string;
  @property({optional: true})
  isFetchDetailsRequired?: boolean;
  @property({optional: true})
  sourceIdentificationCode: string;
}

@model()
export class AutoUpdateTicketRequest {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  eventid: string;
  @property({required: true})
  ticketid: string;
  @property({optional: true})
  tickettype?: string;
  @property({optional: true})
  ticketpriority?: number;
  @property({optional: true})
  ticketdesc?: string;
  @property({optional: true})
  ticketimpact?: string;
  @property({required: true})
  environment: string;
  @property.array(String, {optional: true})
  ticketassignmentgroups?: string[]; // These groups will be assigned via assignment service after finding actual resources of each group
  @property({required: true})
  status: string;
  @property({optional: true})
  statusdescription?: string;
  @property({optional: true})
  channelid?: string;
  @property({optional: true})
  ticketDetail?: Object;
  @property({optional: true})
  resolver?: string;
  @property({optional: true})
  resolvetime?: string;
  @property({optional: true})
  isFetchDetailsRequired?: boolean;
  @property({optional: true})
  isMajor?: boolean;
  @property({optional: true})
  affectedSite?: string;
  @property({optional: true})
  sourceidentificationcode: string;
  @property({optional: true})
  start_time?: string;
  @property({optional: true})
  last_updated_time?: string;
  @property({optional: true})
  work_notes?: string;
  @property({optional: true})
  close_notes?: string;
  @property({optional: true})
  breach_time?: string;
  @property({optional: true})
  reported_priority?: string;
  @property({optional: true})
  incident_url?: string;
  @property({optional: true})
  problem_id?: string;
  @property({optional: true})
  problem_id_url?: string;
  @property({optional: true})
  has_breached?: string;
}

@model()
export class GetOpenticketsForAccountRequest {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property(FilterTicketParameter)
  filterParameters?: FilterTicketParameter;
}

@model()
export class GetOpenticketsForAccountRequestAsync {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({optional: true})
  callbackUrl?: string;
  @property(FilterTicketParameter)
  filterParameters?: FilterTicketParameter;
}
