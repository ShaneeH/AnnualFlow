import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { NewDocument } from './new-document';

describe('NewDocument', () => {
  let fixture: ComponentFixture<NewDocument>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewDocument],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(NewDocument);
    fixture.detectChanges();
  });

  it('should show the upload flow with a link back to My Reports', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('app-add-document')).toBeTruthy();
    expect(element.querySelector('a.back-link')?.getAttribute('href')).toBe('/documents');
  });
});
