import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AntsoftSignaturePad } from './antsoft-signature-pad';

describe('AntsoftSignaturePad', () => {
  let component: AntsoftSignaturePad;
  let fixture: ComponentFixture<AntsoftSignaturePad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AntsoftSignaturePad],
    }).compileComponents();

    fixture = TestBed.createComponent(AntsoftSignaturePad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
