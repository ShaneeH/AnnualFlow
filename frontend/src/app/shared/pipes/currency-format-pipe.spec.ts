import { CurrencyFormatPipe } from './currency-format-pipe';

describe('CurrencyFormatPipe', () => {
  let pipe: CurrencyFormatPipe;

  beforeEach(() => {
    pipe = new CurrencyFormatPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return a dash for null values', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('should format normal currency values', () => {
    expect(pipe.transform(500)).toBe('€500');
  });

  it('should format thousands', () => {
<<<<<<< HEAD
    expect(pipe.transform(25_000)).toBe('€25.0K');
  });

  it('should format millions', () => {
    expect(pipe.transform(2_500_000)).toBe('€2.50M');
  });

  it('should format billions', () => {
    expect(pipe.transform(1_500_000_000)).toBe('€1.50B');
=======
    expect(pipe.transform(25_000)).toBe('€25.0k');
  });

  it('should format millions', () => {
    expect(pipe.transform(2_500_000)).toBe('€2.5m');
  });

  it('should format billions', () => {
    expect(pipe.transform(1_500_000_000)).toBe('€1.5bn');
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  });
});