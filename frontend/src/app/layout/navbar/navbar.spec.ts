import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        // Provides Router and ActivatedRoute for routerLink in the template.
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
<<<<<<< HEAD
});
=======

  it('should show "Annualflow" as a link to the home page', () => {
    const logo: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a.navbar-logo');

    expect(logo?.textContent?.trim()).toBe('Annualflow');
    expect(logo?.getAttribute('href')).toBe('/');
  });

  it('has an accessible hamburger button that toggles the links', () => {
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector<HTMLButtonElement>('.menu-toggle')!;
    const links = el.querySelector('#navbar-links')!;

    expect(button.getAttribute('aria-controls')).toBe('navbar-links');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Open menu');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Close menu');
    expect(links.classList).toContain('open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(links.classList).not.toContain('open');
  });
});
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
