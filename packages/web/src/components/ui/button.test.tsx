import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button type="button">Hello</Button>);
    expect(screen.getByRole('button', { name: 'Hello' })).toBeTruthy();
  });
});
