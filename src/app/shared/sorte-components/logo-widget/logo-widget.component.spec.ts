import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoWidgetComponent } from './logo-widget.component';

describe('LogoWidgetComponent', () => {
  let component: LogoWidgetComponent;
  let fixture: ComponentFixture<LogoWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoWidgetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LogoWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
