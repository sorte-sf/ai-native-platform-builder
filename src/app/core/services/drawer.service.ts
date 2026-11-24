import { Injectable } from '@angular/core';
import { IActionMode } from '@core/enums/draw-actions.enum';
import { ReplaySubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DrawerService<T> {

  public openBehavior = new ReplaySubject<boolean>(1);
  public openRequested = this.openBehavior.asObservable();
  public isOpen: boolean = false;
  public drawerState: Subject<boolean> = new Subject();
  public drawerStateChanged = this.drawerState.asObservable();

  public actionModeChanged: ReplaySubject<IActionMode> = new ReplaySubject<IActionMode>(1);
  private _actionMode: IActionMode = IActionMode.view;

  public get actionMode(): IActionMode {
    return this._actionMode;
  }

  public set actionMode(value: IActionMode) {
    this._actionMode = value;
    this.actionModeChanged.next(value);
  }

  public model: T | null = null;

  public actionModes = IActionMode;

  public open(data: T, actionMode: IActionMode): void {

    if (this.model !== data || !this.isOpen) {
      this.model = data;
      this.openBehavior.next(true);
      this.isOpen = true;
    } else {
      this.openBehavior.next(false);
      this.isOpen = false;
    }
    this.actionMode = actionMode;

  }

  public close(closeDrawer: boolean= false): void {
    this.actionMode = IActionMode.view;
    this.model = null;
    this.openBehavior.next(closeDrawer);
  }
}


export { IActionMode };

