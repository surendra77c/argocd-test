import {model, property} from '@loopback/repository';
import {NotificationEmails} from './assignmentEmails.model';
//import {IncidentProperties} from './ticketParams.model';

@model()
export class InformationParams {
  @property({optional: true})
  reportingSystemURL: string;
  @property({optional: true})
  additionalInfo: string;
  @property({optional: true})
  message: Object;
  @property({optional: true})
  threadPayload?: Object;
  @property({optional: true})
  ts?: string;
  @property.array(NotificationEmails, {optional: true})
  notificationEmails?: NotificationEmails[];
  @property({optional: true})
  reportingSystemName: string;
}

// @model()
// export class AdditionalProperties {
//   // @property({optional: true})
//   // incident: IncidentProperties;
//   @property({
//     optional: true,
//     jsonSchema: {
//       minProperties: 0,
//       maxProperties: 1,
//       errorMessage: 'Each Property to have Only One Atrribute',
//     },
//   })
//   addProperty: Object;
// }
