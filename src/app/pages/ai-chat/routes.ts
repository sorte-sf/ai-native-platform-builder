import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/ai-chat.component'),
    children: [
      {
        path: ':id',
        loadComponent: () => import('./features/conversation.component'),
      },
    ],
  },
];

export default routes;
