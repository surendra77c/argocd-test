import {ChatopsKnightChannelCreationEvent} from './ckChannelInfo.model';
import {model, property, Model} from '@loopback/repository';

@model()
export class ReceiveChannelCreationEvent extends Model {
  @property({required: true})
  status: boolean;
  @property({optional: true})
  payload: ChatopsKnightChannelCreationEvent;
  @property({optional: true})
  error: ErrorObject;
}
export interface ErrorObject {
  message: string;
  payload?: object;
}
