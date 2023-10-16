import {model, property} from '@loopback/repository';

@model()
export class AccountCodeLocator {
  @property({required: true})
  SearchKey: string;
  @property({required: true})
  SearchValue: string;
}
