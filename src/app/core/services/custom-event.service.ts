import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomEventService {
  private subjects: Record<string, Subject<unknown>> = {};


  publish(eventName: string): void {

    this.subjects[eventName] ??= new Subject<unknown>();
    this.subjects[eventName].next(null);

  }

  on(eventName: string): Observable<unknown> {
    this.subjects[eventName] =
      this.subjects[eventName] ??= new Subject<unknown>();
    return this.subjects[eventName].asObservable();
  }

  publishWithData<T>(eventName: string, data?: T): void {
    this.subjects[eventName] ??= new ReplaySubject<T>() as Subject<unknown>;
    this.subjects[eventName].next(data);
  }

  onDataRecieved<T>(eventName: string): Observable<T> {
    this.subjects[eventName] =
      this.subjects[eventName] ??= new ReplaySubject<T>() as Subject<unknown>;
    return this.subjects[eventName].asObservable() as Observable<T>;
  }

}
