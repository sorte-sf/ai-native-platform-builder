import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationComponentTree } from './application-component-tree';

describe('ApplicationComponentTree', () => {
  let component: ApplicationComponentTree;
  let fixture: ComponentFixture<ApplicationComponentTree>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationComponentTree],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationComponentTree);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
