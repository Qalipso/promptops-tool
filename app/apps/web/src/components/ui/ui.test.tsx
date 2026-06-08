import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, Button, EmptyState, stateTone } from './index';

describe('stateTone', () => {
  it('maps states to tones', () => {
    expect(stateTone('active')).toBe('success');
    expect(stateTone('draft')).toBe('warning');
    expect(stateTone('archived')).toBe('neutral');
    expect(stateTone('whatever')).toBe('neutral');
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge tone="success">active</Badge>);
    expect(screen.getByText('active')).toBeDefined();
  });
});

describe('Button', () => {
  it('renders label and respects disabled', () => {
    render(
      <Button disabled size="sm">
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('EmptyState', () => {
  it('shows title and description', () => {
    render(<EmptyState title="No assets" desc="Create one" />);
    expect(screen.getByText('No assets')).toBeDefined();
    expect(screen.getByText('Create one')).toBeDefined();
  });
});
