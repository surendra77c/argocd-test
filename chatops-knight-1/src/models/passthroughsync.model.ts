import {model, property} from '@loopback/repository';
// import {PassthroughCallback} from './passthroughCallback.model';

@model()
export class PassThroughSyncRequest {
  @property({required: false})
  accountCode: String;
  @property({required: true})
  method: string;
  @property({required: true})
  uri: string;
  @property({required: true})
  requestType: string;
  @property({required: true})
  passThroughHeaders: Object;
  @property({required: true})
  passThroughPayload: Object;
  @property({type: 'boolean', default: true, optional: true})
  isSync: boolean;
}
