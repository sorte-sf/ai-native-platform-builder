import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { SnackBarService } from './snackbar.service';
import { AuthService } from '@core/services/auth/auth.service';
import { SignalRState } from '../enums/signalr-state';
import { getGatewayApiBaseUrl } from '../gateway-config';

export interface RealtimeEvent {
  eventId: string;
  tenantId: string;
  eventName: string;
  message?: string | null;
  userId?: string | null;
  occurredAtUtc: string;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private accessHubConnection?: HubConnection;
  private starting?: Promise<void>;
  private connectionGeneration = 0;

  signalRStatus$: Observable<SignalRState>;
  private signalRStatusSubject = new BehaviorSubject<SignalRState>(SignalRState.Offline);

  signalRNotificationData$: Observable<RealtimeEvent | undefined>;
  private signalRNotificationSubject = new BehaviorSubject<RealtimeEvent | undefined>(undefined);

  private readonly snackBar = inject(SnackBarService);
  private readonly authService = inject(AuthService);

  private signalRUrl: string = `${getGatewayApiBaseUrl()}/realtime/hub`;

  constructor() {
    this.signalRStatus$ = this.signalRStatusSubject.asObservable();
    this.signalRNotificationData$ = this.signalRNotificationSubject.asObservable();
  }

  public startConnection(): Promise<void> {
    if (!this.authService.isAuthenticated()) return Promise.resolve();
    if (this.accessHubConnection?.state === HubConnectionState.Connected ||
      this.accessHubConnection?.state === HubConnectionState.Connecting) return Promise.resolve();
    if (this.starting) return this.starting;


    console.log('Starting SignalR connection...', this.signalRUrl);

    const generation = ++this.connectionGeneration;
    const connection = new HubConnectionBuilder()
      .withUrl(this.signalRUrl, {
        accessTokenFactory: () => this.authService.token() ?? ''
      })
      .withAutomaticReconnect([0, 1000, 5000, 15000])
      .configureLogging(LogLevel.Warning)
      .build();
    this.accessHubConnection = connection;

    connection.on('RealtimeEvent', (event: RealtimeEvent) => {
      this.signalRNotificationSubject.next(event);
      this.snackBar.info(event.message?.trim() || event.eventName, false);
    });
    connection.onreconnecting(() => this.signalRStatusSubject.next(SignalRState.Reconnecting));
    connection.onreconnected(() => this.signalRStatusSubject.next(SignalRState.Online));
    connection.onclose(() => {
      this.signalRStatusSubject.next(SignalRState.Offline);
      if (!this.starting && this.accessHubConnection === connection && this.authService.isAuthenticated()) {
        setTimeout(() => {
          if (this.accessHubConnection === connection && this.authService.isAuthenticated()) {
            this.accessHubConnection = undefined;
            void this.startConnection();
          }
        }, 1000);
      }
    });

    this.starting = this.connectUntilReady(connection, generation)
      .finally(() => {
        if (this.connectionGeneration === generation) this.starting = undefined;
      });
    return this.starting;
  }

  private async connectUntilReady(connection: HubConnection, generation: number): Promise<void> {
    let attempt = 0;
    while (this.connectionGeneration === generation && this.accessHubConnection === connection && this.authService.isAuthenticated()) {
      try {
        await connection.start();
        this.signalRStatusSubject.next(SignalRState.Online);
        return;
      } catch (error) {
        this.signalRStatusSubject.next(SignalRState.Offline);
        if (attempt === 0) console.warn('Realtime connection could not be started; retrying.', error);
        const delays = [1000, 2000, 5000, 10000, 30000];
        await new Promise(resolve => setTimeout(resolve, delays[Math.min(attempt, delays.length - 1)]));
        attempt++;
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.connectionGeneration++;
    const connection = this.accessHubConnection;
    this.accessHubConnection = undefined;
    this.starting = undefined;
    try {
      if (connection) await connection.stop();
    } catch (error) {
      console.warn('Realtime connection could not be stopped cleanly.', error);
    } finally {
      this.signalRStatusSubject.next(SignalRState.Offline);
    }
  }

  /** Tenant membership is derived from the signed token and managed by the shared hub. */
  public async removeAntEventsGroup(): Promise<void> { }
}
