import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClearEffect } from './ClearEffect';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | undefined;

afterEach(() => {
  if (host) {
    act(() => host?.remove());
    host = undefined;
  }
});

describe('ClearEffect', () => {
  it('does not render an inactive effect', () => {
    host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<ClearEffect active={false} />));
    expect(host.querySelector('.clear-effect')).toBeNull();
    act(() => root.unmount());
  });

  it('renders the celebration and exposes a skip action', () => {
    host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onSkip = vi.fn();
    act(() =>
      root.render(<ClearEffect active motion="reduced" onSkip={onSkip} skipLabel="Skip" />),
    );

    expect(host.querySelectorAll('.clear-effect__confetti i')).toHaveLength(30);
    expect(host.querySelectorAll('.clear-effect__burst i')).toHaveLength(12);
    expect(host.querySelector('.clear-effect')?.classList.contains('motion-reduced')).toBe(true);
    expect(host.querySelector('.clear-effect')?.getAttribute('role')).toBeNull();
    const skip = host.querySelector<HTMLButtonElement>('.clear-effect__skip');
    expect(skip?.getAttribute('aria-label')).toBe('Skip');
    act(() => skip?.click());
    expect(onSkip).toHaveBeenCalledOnce();
    act(() => root.unmount());
  });
});
