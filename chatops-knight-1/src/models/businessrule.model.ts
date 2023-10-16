import {model, property} from '@loopback/repository';
// import {AccountCodeLocator} from './accountcodelocator.model';
// import {PassthroughRequest} from './passthroughRequest.model';
// import {PassthroughCallback} from './passthroughCallback.model';

@model()
export class DirectIntegrationRequest {
  @property({required: true})
  accountCode: string;
  @property({required: true})
  ticketId: string;
  @property({required: true})
  previousData: Object;
  @property({required: false})
  ticketType?: string;
  @property({required: false})
  currentData: Object;
}
