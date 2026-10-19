import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ThemeToggle', () => {
  it('renders with accessible button and toggles between dark and light modes', () => {
    localStorage.clear();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label');

    const initialLabel = button.getAttribute('aria-label');
    fireEvent.click(button);

    const toggledLabel = button.getAttribute('aria-label');
    expect(toggledLabel).not.toEqual(initialLabel);
  });
});
