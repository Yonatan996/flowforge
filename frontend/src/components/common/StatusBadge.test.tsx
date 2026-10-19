import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders active status with emerald style and correct label', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders draft status correctly', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders SUCCEEDED status in execution context', () => {
    render(<StatusBadge status="SUCCEEDED" />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('renders FAILED status in execution context', () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders SKIPPED status in condition branch context', () => {
    render(<StatusBadge status="skipped" />);
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });
});
