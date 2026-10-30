import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ServerStateService } from './application/server-state.service';
import { provideInfrastructure } from './infrastructure/providers';
import { provideI18n } from './presentation/i18n/provide-i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideInfrastructure(),
    provideI18n(),
    provideAppInitializer(() => inject(ServerStateService).start()),
  ]
};
