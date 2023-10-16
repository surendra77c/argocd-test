import {model, property} from '@loopback/repository';

@model()
export class PassthroughRequest {
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
}
