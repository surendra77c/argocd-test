import {model, property} from '@loopback/repository';

@model()
export class PassthroughCallback {
  @property({required: true})
  returnData: Object; // TODO: support further data type eg XML
  @property({optional: true})
  callbackHeaders: Object;
  @property({required: true})
  callbackUrl: string;
  @property({optional: true})
  method: string;
}
