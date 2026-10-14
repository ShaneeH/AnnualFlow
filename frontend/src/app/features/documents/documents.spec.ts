import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Documents } from './documents';

describe('Documents', () => {
  let component: Documents;
  let fixture: ComponentFixture<Documents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Documents],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(Documents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a compact add button instead of the full upload form', () => {
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('a.create-report-button');

    expect(button?.getAttribute('href')).toBe('/documents/new');
    expect(element.querySelector('app-add-document')).toBeNull();
  });

  it('should title the list "My Reports"', () => {
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('My Reports');
  });
});
