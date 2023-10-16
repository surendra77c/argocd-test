import {model, property, Model} from '@loopback/repository';

@model()
export class BasicCallBackInfo extends Model {
  @property({optional: true})
  message: string;
  @property({required: true})
  callbackUrl: string;
  @property({required: true})
  sourceCode: string;
  @property({optional: true})
  error?: ErrorObject;
}
export interface ErrorObject {
  message: string;
  payload?: object;
}
