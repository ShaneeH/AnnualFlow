import { TestBed } from '@angular/core/testing';

import { LetterAvatar } from './letter-avatar';

describe('LetterAvatar', () => {
  it('shows the upper-case first letter, or ? without a name', () => {
    const fixture = TestBed.createComponent(LetterAvatar);
    fixture.componentRef.setInput('name', ' shane');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('S');

    fixture.componentRef.setInput('name', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('?');
  });
});
