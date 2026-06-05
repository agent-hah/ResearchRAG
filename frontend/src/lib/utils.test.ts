import { describe, it, expect, vi } from 'vitest';
import { cn, formatBytes, formatDate, formatDuration, truncateText, debounce, generateId, isValidEmail, capitalizeFirst, pluralize } from './utils';

describe('utils', () => {
  it('cn merges class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
    expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
  });

  it('formatBytes formats correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024, 0)).toBe('1 MB');
  });

  it('formatDate formats date correctly', () => {
    const date = new Date('2023-10-15T12:00:00Z');
    const result = formatDate(date);
    expect(result).toContain('Oct');
    expect(result).toContain('15');
    expect(result).toContain('2023');
  });

  it('formatDuration formats duration correctly', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(90000)).toBe('1.5m');
  });

  it('truncateText truncates properly', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
    expect(truncateText('hello', 5)).toBe('hello');
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('debounce limits function calls', () => {
    vi.useFakeTimers();
    const func = vi.fn();
    const debounced = debounce(func, 100);
    
    debounced();
    debounced();
    debounced();
    
    expect(func).not.toBeCalled();
    
    vi.advanceTimersByTime(100);
    
    expect(func).toBeCalledTimes(1);
    vi.useRealTimers();
  });

  it('generateId generates a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('isValidEmail validates emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('test@example')).toBe(false);
    expect(isValidEmail('test')).toBe(false);
    expect(isValidEmail('test@.com')).toBe(false);
  });

  it('capitalizeFirst capitalizes first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('Hello')).toBe('Hello');
    expect(capitalizeFirst('')).toBe('');
  });

  it('pluralize works correctly', () => {
    expect(pluralize(1, 'apple')).toBe('apple');
    expect(pluralize(2, 'apple')).toBe('apples');
    expect(pluralize(2, 'person', 'people')).toBe('people');
  });
});
