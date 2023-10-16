import {getService} from '@loopback/service-proxy';
import {inject, Provider} from '@loopback/core';
import {ChatopsknightDataSource} from '../datasources';
import {AccountCodeLocator} from '../models';
import {
  AssignmentEmails,
  PagerDutyAssignments,
} from '../models/assignmentEmails.model';
export interface ChatopsKnight {
  // this is where you define the Node.js methods that will be
  // mapped to REST/SOAP/gRPC operations as stated in the datasource
  // json file.
  sendbackChannelInfoWithBasicAuth(
    basicAuthToken: string,
    url: string,
    accountCodeLocators: string,
    transactionid: string,
    channelid: string,
    channelname: string,
    ticketid: string,
    channelurl: string,
    workspaceid: string,
  ): Promise<void>;
  sendbackChannelInfoWithApiKey(
    userName: string,
    apiKey: string,
    url: string,
    accountCodeLocators: string,
    transactionid: string,
    channelid: string,
    channelname: string,
    ticketid: string,
    channelurl: string,
    workspaceid: string,
  ): Promise<void>;
  sendbackChannelInfoWithoutAuth(
    url: string,
    accountCodeLocators: string,
    transactionid: string,
    channelid: string,
    channelname: string,
    ticketid: string,
    channelurl: string,
    workspaceid: string,
  ): Promise<void>;
  sendbackTicketChannelInfoWithBasicAuth(
    basicAuthToken: string,
    url: string,
    accountCodeLocators: string,
    transactionid: string,
    channelid: string,
    channelname: string,
    ticketid: string,
    channelurl: string,
    workspaceid: string,
  ): Promise<void>;
  sendbackTicketChannelInfoWithApiKey(
    userName: string,
    apiKey: string,
    url: string,
    accountCodeLocators: string,
    transactionid: string,
    channelid: string,
    channelname: string,
    ticketid: string,
    channelurl: string,
    workspaceid: string,
  ): Promise<void>;
  sendbackTicketChannelInfoWithoutAuth(
    url: string,
    accountCodeLocators: string,
    transactionid: string,
    channelid: string,
    channelname: string,
    ticketid: string,
    channelurl: string,
    workspaceid: string,
  ): Promise<void>;
  updateChannelIdInTicketingSystem(
    url: string,
    transactionid: string,
    accountCode: string,
    eventid: string,
    ticketid: string,
    channelid: string,
    channelname: string,
    channelurl: string,
  ): Promise<string>;
  getTicketDetails(
    url: string,
    transactionid: string,
    accountCode: string,
    ticketid: string,
    msgRequest: Object,
  ): Promise<string>;
  updateChannelCreatedStatus(
    url: string,
    transactionid: string,
    msgRequest: Object,
    message: Object,
  ): Promise<string>;
  assignResourceToChannel(
    url: string,
    resourceids: string[],
    transactionid: string,
    channelid: string,
    accountCode: string,
  ): Promise<string>;
  assignOwnerToCollaborator(
    url: string,
    transactionid: string,
    channelid: string,
    accountCode: string,
    ticketid: string,
    mappedRule?: Object,
  ): Promise<string>;
  assignPagerDutyOwnerToCollaborator(
    url: string,
    transactionid: string,
    channelid: string,
    accountCode: string,
    ticketid: string,
    pagerDutyAssignments: PagerDutyAssignments[],
  ): Promise<string>;
  assignGnmGrpToCollaborator(
    url: string,
    transactionid: string,
    channelid: string,
    accountCode: string,
    createRequest: Object,
    mappedRule?: Object,
  ): Promise<string>;
  createChannel(
    url: string,
    accountCodeLocators: AccountCodeLocator[],
    sourceidentificationcode: string,
    transactionid: string,
    accountCode: string,
    eventid: string,
    ticketid: string,
    tickettype: string,
    ticketpriority: number,
    ticketdesc: string,
    ticketimpact: string,
    ticketassignmentgroups: string[],
    environment: string,
    defaultassignments: string[],
    externalcallbackaddress: string,
    isFetchDetailsRequired: boolean,
    channelCreateRequest?: Object,
    isIncident?: boolean,
    isMajor?: boolean,
    additionalProperties?: Object,
    isAccountOnboarded?: boolean,
    blockAction?: boolean,
    assignmentEmails?: AssignmentEmails[],
    status?: string,
    extraProp?: Object,
  ): Promise<string>;
  updateChannel(
    url: string,
    transactionid: string,
    accountCode: string,
    eventid: string,
    ticketid: string,
    tickettype: string,
    ticketpriority: number,
    ticketdesc: string,
    ticketimpact: string,
    ticketassignmentgroups: string[],
    environment: string,
    status: string,
    statusdescription: string,
    dashboardstatus: Object,
    channelid: string,
    resolver: string,
    resolvetime: string,
    owner: string,
    sourceidentificationcode: string,
    isMajor: boolean,
    affectedSite: string,
    start_time?: string,
    last_updated_time?: string,
    work_notes?: string,
    close_notes?: string,
    breach_time?: string,
    reported_priority?: string,
    incident_url?: string,
    problem_id?: string,
    problem_id_url?: string,
    has_breached?: string,
  ): Promise<string>;
  createTicketChannel(
    url: string,
    transactionid: string,
    accountCodeLocators: Object,
    ticketid: string,
    tickettype: string,
    ticketpriority: number,
    ticketdesc: string,
    ticketimpact: string,
    environment: string,
    channelCreateRequest: Object,
    eventid?: string,
    ticketassignmentgroups?: string[],
  ): Promise<string>;
  acknowledgeMessage(
    url: string,
    transactionid: string,
    msgRequest: Object,
    message: Object,
  ): Promise<string>;

  updateTicketInChannel(
    url: string,
    transactionid: string,
    accountCode: string,
    locators: Object,
    ticketReq: Object,
  ): Promise<string>;

  sendbackCallBackWithAuth(
    basicAuthToken: string,
    url: string,
    transactionid: string,
    message: string,
  ): Promise<void>;

  sendbackCallBackWithApiKey(
    userName: string,
    apiKey: string,
    url: string,
    transactionid: string,
    message: string,
  ): Promise<void>;

  sendbackCallBackWithoutAuth(
    url: string,
    transactionid: string,
    message: string,
  ): Promise<void>;

  fetchOpenTicketInAccount(
    url: string,
    transactionid: string,
    accountCode: string,
    sourceId: string,
    request: string,
    isSync: boolean,
  ): Promise<string>;
}

export class ChatopsKnightProvider implements Provider<ChatopsKnight> {
  constructor(
    // chatopsknight must match the name property in the datasource json file
    @inject('datasources.chatopsknight')
    protected dataSource: ChatopsknightDataSource = new ChatopsknightDataSource(),
  ) {}

  value(): Promise<ChatopsKnight> {
    return getService(this.dataSource);
  }
}
