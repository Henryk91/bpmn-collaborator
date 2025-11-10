/** API utility functions. */
import { API_URL } from '../constants';
import { Diagram, DiagramDetail } from '../types';

export const api = {
  /**
   * Fetch all diagrams.
   */
  async getDiagrams(): Promise<Diagram[]> {
    const response = await fetch(`${API_URL}/api/diagrams`);
    if (!response.ok) {
      throw new Error(`Failed to fetch diagrams: ${response.statusText}`);
    }
    const data = await response.json();
    return data.diagrams;
  },

  /**
   * Fetch a specific diagram by ID.
   */
  async getDiagram(diagramId: string): Promise<DiagramDetail> {
    const response = await fetch(`${API_URL}/api/diagrams/${diagramId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Diagram not found');
      }
      throw new Error(`Failed to fetch diagram: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a new diagram.
   */
  async createDiagram(name: string, initialXml?: string): Promise<DiagramDetail> {
    const response = await fetch(`${API_URL}/api/diagrams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        initial_xml: initialXml,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create diagram: ${response.statusText}`);
    }

    return response.json();
  },
};

