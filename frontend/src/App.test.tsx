import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./utils/api', () => ({
  api: {
    getDiagrams: vi.fn().mockResolvedValue([]),
    getDiagram: vi.fn(),
    createDiagram: vi.fn(),
  },
}));

vi.mock('bpmn-js/lib/Modeler', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const services: Record<string, any> = {
        canvas: {
          addMarker: vi.fn(),
        removeMarker: vi.fn(),
        hasMarker: vi.fn(),
      },
      elementRegistry: {
        get: vi.fn(),
        getAll: vi.fn().mockReturnValue([]),
        filter: vi.fn().mockReturnValue([]),
      },
      overlays: {
        add: vi.fn(),
        remove: vi.fn(),
        get: vi.fn(),
        clear: vi.fn(),
      },
      eventBus: {
        on: vi.fn(),
        off: vi.fn(),
        fire: vi.fn(),
      },
    };

      return {
        importXML: vi.fn().mockResolvedValue(undefined),
        saveXML: vi.fn().mockResolvedValue({ xml: '<xml />' }),
        destroy: vi.fn(),
        get: vi.fn((service: string) => services[service]),
      };
    }),
  };
});

describe('App', () => {
  it('renders the diagram list after initial load', async () => {
    render(<App />);

    // Loading state should appear first
    expect(screen.getByText(/loading diagrams/i)).toBeInTheDocument();

    // After the mocked API resolves, the main heading should be visible
    expect(
      await screen.findByRole('heading', { name: /bpmn collaborator/i })
    ).toBeInTheDocument();
  });
});
