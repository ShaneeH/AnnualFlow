import { TestBed } from '@angular/core/testing';
import { MascotComponent, MASCOT_NAME } from './mascot';

describe('MascotComponent', () => {
  it('renders a decorative SVG at the requested size', () => {
    const fixture = TestBed.createComponent(MascotComponent);
    fixture.componentRef.setInput('size', 32);
    fixture.detectChanges();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes an accessible name when labelled', () => {
    const fixture = TestBed.createComponent(MascotComponent);
    fixture.componentRef.setInput('label', `${MASCOT_NAME}, the Annualflow mascot`);
    fixture.detectChanges();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('Ledger');
  });

  it('draws a tilted page with a folded corner, two round eyes and two brows', () => {
    const fixture = TestBed.createComponent(MascotComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.page')).toBeTruthy();
    expect(el.querySelector('.fold')).toBeTruthy();
    expect(el.querySelectorAll('.eyes circle.eye').length).toBe(2);
    expect(el.querySelectorAll('.brows .brow').length).toBe(2);
  });

  it('only animates when asked to', () => {
    const fixture = TestBed.createComponent(MascotComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('animated')).toBe(false);
    fixture.componentRef.setInput('animated', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('animated')).toBe(true);
  });
});
