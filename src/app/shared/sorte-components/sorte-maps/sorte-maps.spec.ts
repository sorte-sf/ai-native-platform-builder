import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SorteMaps } from './sorte-maps';

describe('SorteMaps', () => {
  let component: SorteMaps;
  let fixture: ComponentFixture<SorteMaps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SorteMaps],
    }).compileComponents();

    fixture = TestBed.createComponent(SorteMaps);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
