import { ComponentFixture, TestBed } from '@angular/core/testing';
<<<<<<< HEAD
=======
import { provideRouter } from '@angular/router';
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

import { About } from './about';

describe('About', () => {
  let component: About;
  let fixture: ComponentFixture<About>;
<<<<<<< HEAD
=======
  let el: HTMLElement;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
<<<<<<< HEAD
=======
      providers: [provideRouter([])]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    component = fixture.componentInstance;
    fixture.detectChanges();
<<<<<<< HEAD
=======
    el = fixture.nativeElement;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
<<<<<<< HEAD
=======

  it('describes it as an open source project', () => {
    expect(el.querySelector('.lead')?.textContent).toContain('An open source project by Shane Hahesy');
    expect(el.textContent).not.toContain('portfolio');
  });

  it('keeps the technical Data Enrichment notes', () => {
    const section = el.querySelector('#data-enrichment')!;
    expect(section.textContent).toContain('COALESCE(new, existing)');
    expect(section.textContent).toContain('conflicts[]');
    expect(section.textContent).toContain('document_periods');
  });

  it('has a Get involved section with GitHub issues and contact links', () => {
    const section = el.querySelector('#contributing')!;
    const hrefs = Array.from(section.querySelectorAll('a')).map(a => a.getAttribute('href'));
    expect(hrefs).toContain('https://github.com/ShaneeH/senus-board-reporting/issues');
    expect(hrefs).toContain('https://github.com/ShaneeH/senus-board-reporting');
    expect(hrefs).toContain('mailto:s.hahesy@outlook.com');
    expect(hrefs).toContain('https://linkedin.com/in/shane-hahesy');
    expect(hrefs).toContain('https://github.com/ShaneeH');
    expect(section.textContent).toContain('Spotted a bug? Just email me at s.hahesy@outlook.com');
  });

  it('no longer has a Current limitations section', () => {
    expect(el.querySelector('#limits-title')).toBeNull();
    expect(el.textContent).not.toContain('Current limitations');
  });
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
});
