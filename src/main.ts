import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';
import { loadGatewayConfig } from './app/core/gateway-config';

loadGatewayConfig().then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
