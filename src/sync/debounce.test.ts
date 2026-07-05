import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createKeyedDebouncer } from './debounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createKeyedDebouncer', () => {
  it('does not run before the delay elapses', () => {
    const debouncer = createKeyedDebouncer(1000);
    const run = vi.fn();
    debouncer.schedule('a', run);

    vi.advanceTimersByTime(999);
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('collapses repeated schedules for the same key into a single run of the LAST callback', () => {
    const debouncer = createKeyedDebouncer(1000);
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();

    debouncer.schedule('profile-1', first);
    vi.advanceTimersByTime(500);
    debouncer.schedule('profile-1', second);
    vi.advanceTimersByTime(500);
    debouncer.schedule('profile-1', third);
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(third).toHaveBeenCalledTimes(1);
  });

  it('tracks independent keys independently — one profile changing never delays another', () => {
    const debouncer = createKeyedDebouncer(1000);
    const runA = vi.fn();
    const runB = vi.fn();

    debouncer.schedule('profile-a', runA);
    vi.advanceTimersByTime(600);
    debouncer.schedule('profile-b', runB);
    vi.advanceTimersByTime(400);

    expect(runA).toHaveBeenCalledTimes(1);
    expect(runB).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(runB).toHaveBeenCalledTimes(1);
  });

  it('cancel() prevents a scheduled run', () => {
    const debouncer = createKeyedDebouncer(1000);
    const run = vi.fn();
    debouncer.schedule('a', run);
    debouncer.cancel('a');
    vi.advanceTimersByTime(2000);
    expect(run).not.toHaveBeenCalled();
  });

  it('pending() reflects whether a run is still scheduled', () => {
    const debouncer = createKeyedDebouncer(1000);
    expect(debouncer.pending('a')).toBe(false);
    debouncer.schedule('a', () => {});
    expect(debouncer.pending('a')).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(debouncer.pending('a')).toBe(false);
  });
});
