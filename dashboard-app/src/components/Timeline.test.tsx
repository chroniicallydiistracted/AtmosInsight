import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Timeline } from './Timeline';

function mockFetch(data: string[]) {
  globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => data });
}

describe('Timeline', () => {
  it('renders slider when times load', async () => {
    mockFetch(['t1', 't2', 't3']);
    render(<Timeline layerId="demo" />);
    await waitFor(() => screen.getByLabelText('timeline'));
    const slider = screen.getByLabelText('timeline') as HTMLInputElement;
    expect(slider.max).toBe('2');
  });
});
