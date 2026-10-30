import { Routes } from '@angular/router';
import { Overlay } from './presentation/overlay/overlay';
import { Panel } from './presentation/panel/panel';

export const routes: Routes = [
  { path: '', component: Panel },
  { path: 'overlay', component: Overlay },
  { path: '**', redirectTo: '' },
];
