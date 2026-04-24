import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiValueChipInput } from '@/components/ui/MultiValueChipInput';

describe('MultiValueChipInput', () => {
  it('adds a chip when user presses Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={[]} onChange={onChange} placeholder="Enter" />);
    const input = screen.getByPlaceholderText('Enter');
    await user.type(input, 'CA{enter}');
    expect(onChange).toHaveBeenLastCalledWith(['CA']);
  });

  it('adds a chip on comma', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'DR,');
    expect(onChange).toHaveBeenLastCalledWith(['DR']);
  });

  it('removes a chip when backspace pressed on empty input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={['A', 'B']} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(['A']);
  });

  it('removes a chip when × clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={['A', 'B']} onChange={onChange} />);
    const removeB = screen.getByRole('button', { name: /remove B/i });
    await user.click(removeB);
    expect(onChange).toHaveBeenLastCalledWith(['A']);
  });
});
