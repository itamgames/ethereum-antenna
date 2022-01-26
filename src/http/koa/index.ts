import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { constants } from "http2";
import { IEventStore } from '../../eventStore/interface';
import { HttpConfig, IHttp } from '../interface';

export class HttpKoa implements IHttp {
  config: HttpConfig;

  constructor(config: HttpConfig) {
    this.config = config;
  }

  initializeApp({ eventStore }: { eventStore: IEventStore }) {
    const router = new Router();
    if (this.config.prefix) {
      router.prefix(this.config.prefix);
    }
    // create contracts
    router.post('/contracts', async (ctx) => {
      const { address, abi, trackedBlock, options } = ctx.request.body;
      await eventStore.addContract({ address, abi, trackedBlock, options });
      ctx.status = constants.HTTP_STATUS_NO_CONTENT;
    });
  
    // update contracts
    router.put('/contracts/:address', async (ctx) => {
      const { address } = ctx.params;
      const { abi, trackedBlock, options } = ctx.request.body;
      await eventStore.updateContract({ address, abi, trackedBlock, options });
      ctx.status = constants.HTTP_STATUS_NO_CONTENT;
    });
  
    // delete contracts
    router.delete('/contracts/:address', async (ctx) => {
      const { address } = ctx.params;
      await eventStore.removeContract(address);
      ctx.status = constants.HTTP_STATUS_NO_CONTENT;
    });
  
    // get contracts
    router.get('/contracts', async (ctx) => {
      const { address } = ctx.query;
      ctx.body = await eventStore.getContracts(address as string);
      ctx.status = constants.HTTP_STATUS_OK;
    });
  
    const app = new Koa();
    app.use(bodyParser());
    app.use(router.routes());
    app.use(router.allowedMethods());
  
    return app;
  }

  listenHTTP({ eventStore }: { eventStore: IEventStore }) {
    const app = this.initializeApp({ eventStore });
    const port = this.config.port || 3000;
    app.listen(port, () => console.log(`HTTP server started on port: ${port}`));
  }
}
