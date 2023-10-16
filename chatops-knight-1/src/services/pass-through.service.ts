import {getService} from '@loopback/service-proxy';
import {inject, Provider} from '@loopback/core';
import {ChatopsknightDataSource} from '../datasources';

export interface PassThrough {
  // this is where you define the Node.js methods that will be
  // mapped to REST/SOAP/gRPC operations as stated in the datasource
  // json file.
  callItsmService(
    url: string,
    transactionid: string,
    accountCode: string,
    passThroughRequestData: Object,
    isSync: boolean,
  ): Promise<void>;
}

export class PassThroughProvider implements Provider<PassThrough> {
  constructor(
    // chatopsknight must match the name property in the datasource json file
    @inject('datasources.chatopsknight')
    protected dataSource: ChatopsknightDataSource = new ChatopsknightDataSource(),
  ) {}

  value(): Promise<PassThrough> {
    return getService(this.dataSource);
  }
}
