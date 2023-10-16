import {model, property} from '@loopback/repository';

@model()
export class FilterTicketParameter {
  @property({optional: true})
  ticketPriority: number;
  @property({optional: true})
  isMajor: boolean;
}
