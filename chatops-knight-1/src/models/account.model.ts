import {model, property} from '@loopback/repository';
import {AccountCodeLocator} from './accountcodelocator.model';

@model()
export class Account {
  @property({required: true})
  accountCode: string;
  @property({type: 'boolean', default: false, required: true})
  enabled: boolean;
  @property.array(AccountCodeLocator, {required: true})
  accountCodeLocator?: AccountCodeLocator[];
  @property({optional: true})
  message: string;
}

export interface Locator {
  accountCodeLocator: AccountCodeLocator[];
}
