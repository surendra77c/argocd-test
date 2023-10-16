import {model, property} from '@loopback/repository';

@model()
export class AssignmentEmails {
  @property({required: true})
  role: string;
  @property({required: true})
  email: string;
}

@model()
export class PagerDutyServRules {
  @property({required: true})
  name: string;
  @property({required: true})
  rule: string;
  @property({required: true})
  id: string;
}

@model()
export class PagerDutyAssignments {
  @property({required: true})
  apiKey: string;
  @property({required: true})
  serviceRules: PagerDutyServRules[];
}

@model()
export class NotificationEmails {
  @property({required: true})
  email: string;
}
