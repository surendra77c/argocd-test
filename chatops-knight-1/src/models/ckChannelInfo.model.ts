import {Model, model, property} from '@loopback/repository';

import {AccountCodeLocator} from './accountcodelocator.model';

@model()
export class ChatopsKnightChannelCreationEvent extends Model {
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  channelid: string;
  @property({required: true})
  channelname: string;
  @property({optional: true})
  channelurl: string;
  @property({optional: true})
  collabTool: string;
  @property({optional: true})
  eventid: string;
  @property({required: true})
  accountcode: string;
  @property({required: true})
  workspaceid: string;
  @property({required: true})
  ticketid: string;
  @property({optional: true})
  externalcallbackaddress: string;
  @property({optional: true})
  sourceidentificationcode: string;
  @property({optional: true})
  channelCreateRequest: Object;
  @property({optional: true})
  createRequest: Object;
  @property({optional: true})
  channelExists: boolean;
  @property({optional: true})
  callbackid: string;
  @property({optional: true})
  mappedRule: Object;
}

export interface ChatopsKnightChannelCreationEventRelations {
  // describe navigational properties here
}

export type ChatopsKnightChannelCreationEventWithRelations =
  ChatopsKnightChannelCreationEvent &
    ChatopsKnightChannelCreationEventRelations;
