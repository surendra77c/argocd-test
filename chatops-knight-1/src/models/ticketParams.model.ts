import {model, property} from '@loopback/repository';

@model()
export class TicketParams {
  @property({required: true})
  ticketId: string;
  @property({required: true})
  ticketType: string;
  @property({optional: true})
  ticketDesc: string;
  @property.array(String, {optional: true})
  ticketAssignmentGroups: string[];
  @property({optional: true})
  environment: string;
  @property({optional: true})
  status: string;
  @property({optional: true})
  statusDescription: string;
  @property({optional: true})
  ticketPriority: number;
  @property({optional: true})
  ticketImpact: string;
  @property({optional: true})
  resolverName?: string;
  @property({optional: true})
  resolveTime?: string;
}

@model()
export class IncidentProperties {
  @property({optional: true})
  eventid: string;
  @property({optional: true})
  isMajor?: boolean;
}
