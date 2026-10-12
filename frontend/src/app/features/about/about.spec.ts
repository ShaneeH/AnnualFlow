import { ComponentFixture, TestBed } from '@angular/core/testing';

import { About } from './about';

describe('About', () => {
  let component: About;
  let fixture: ComponentFixture<About>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('explains Data Enrichment with an example table', () => {
    const section: HTMLElement = fixture.nativeElement.querySelector('#data-enrichment');
    expect(section).toBeTruthy();
    expect(section.textContent).toContain('COALESCE(new, existing)');
    expect(section.textContent).toContain('conflicts[]');
    expect(section.textContent).toContain('document_periods');
    expect(section.textContent).toContain('Single source of truth');
    expect(section.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
