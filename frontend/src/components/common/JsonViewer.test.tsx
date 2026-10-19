import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { JsonViewer } from './JsonViewer';

describe('JsonViewer', () => {
  it('renders custom title and formatted JSON content', () => {
    const testData = { order_id: 12345, status: 'approved' };
    render(<JsonViewer data={testData} title="Order Details" />);
    expect(screen.getByText('Order Details')).toBeInTheDocument();
    expect(screen.getByText(/"order_id": 12345/)).toBeInTheDocument();
  });
});
