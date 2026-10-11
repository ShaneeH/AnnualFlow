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

  it('should show "Report Hub" as a link to the home page', () => {
    const logo: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a.navbar-logo');

    expect(logo?.textContent?.trim()).toBe('Report Hub');
    expect(logo?.getAttribute('href')).toBe('/');
  });
});
