import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingStore {
  private readonly activeRequests = signal(0);
  readonly isLoading = computed(() => this.activeRequests() > 0);

  start() {
    this.activeRequests.update(count => count + 1);
  }

  stop() {
    this.activeRequests.update(count => Math.max(0, count - 1));
  }
}
