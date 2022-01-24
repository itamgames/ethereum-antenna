import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { constants } from "http2";
import { IEventStore } from '../eventStore/interface';

export function initializeApp(eventStore: IEventStore) {
  const router = new Router();
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

function listenHTTP(port: number, eventStore: IEventStore) {
  const app = initializeApp(eventStore);
  app.listen(port, () => console.log(`HTTP server started on port: ${port}`));
}

export default listenHTTP;
