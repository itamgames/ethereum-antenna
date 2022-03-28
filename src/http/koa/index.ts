import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { constants } from 'http2';
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
    // add contracts
    router.post('/events', async (ctx) => {
      const { contractAddress, abi, blockNumber, options } = ctx.request.body;
      const { override } = ctx.request.query;
      if (override) {
        await eventStore.updateEvent(contractAddress, abi, { blockNumber, options });
      } else {
        await eventStore.addEvent(contractAddress, abi, { blockNumber, options });
      }
      ctx.status = constants.HTTP_STATUS_NO_CONTENT;
    });

    // delete contracts
    router.delete(
      '/contract/:contractAddress/events/:eventName',
      async (ctx) => {
        const { contractAddress, eventName } = ctx.params;
        await eventStore.removeEvent(contractAddress, eventName);
        ctx.status = constants.HTTP_STATUS_NO_CONTENT;
      },
    );

    // get contracts
    router.get('/contracts', async (ctx) => {
      ctx.body = await eventStore.getContracts();
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
