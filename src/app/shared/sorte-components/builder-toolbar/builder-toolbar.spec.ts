import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BuilderToolbar } from './builder-toolbar';

describe('BuilderToolbar', () => {
  let component: BuilderToolbar;
  let fixture: ComponentFixture<BuilderToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderToolbar],
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
