import {model, property} from '@loopback/repository';
import {AccountCodeLocator} from './accountcodelocator.model';
import {PassthroughRequest} from './passthroughRequest.model';
import {PassthroughCallback} from './passthroughCallback.model';

@model()
export class PassThroughRequest {
  @property.array(AccountCodeLocator, {
    optional: true,
    description:
      'Uniquely Identifies the account,(optional against workspaceName)',
  })
  accountCodeLocators: AccountCodeLocator[];
  @property({required: true})
  passThroughRequest: PassthroughRequest;
  @property({required: true})
  passThroughCallback: PassthroughCallback;
}
