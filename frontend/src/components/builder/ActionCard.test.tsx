import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ActionCard } from './ActionCard';
import { StepDefinition } from '../../types';

describe('ActionCard', () => {
  const mockStep: StepDefinition = {
    key: 'charge_card',
    name: 'Charge Credit Card',
    type: 'http_request',
    config: {
      method: 'POST',
      url: 'https://api.stripe.com/v1/charges',
    },
  };

  it('renders step name, key, and method', () => {
    render(
      <ActionCard
        step={mockStep}
        index={0}
        totalSteps={3}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );

    expect(screen.getByText('Charge Credit Card')).toBeInTheDocument();
    expect(screen.getByText('charge_card')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('https://api.stripe.com/v1/charges')).toBeInTheDocument();
  });

  it('triggers onEdit when edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(
      <ActionCard
        step={mockStep}
        index={0}
        totalSteps={3}
        onEdit={handleEdit}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Edit Step Configuration'));
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });
});
