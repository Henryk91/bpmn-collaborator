/** TypeScript type definitions for the application. */

export interface Diagram {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DiagramDetail extends Diagram {
  xml: string;
}

export interface ElementLock {
  user_id: string;
  user_name: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  user?: string;
}

export interface DiagramStateMessage extends WebSocketMessage {
  type: "diagram_state";
  data: {
    xml: string;
    locks: Record<string, ElementLock>;
    my_user_name?: string;
  };
}

export interface DiagramUpdateMessage extends WebSocketMessage {
  type: "diagram_update";
  data: {
    xml: string;
    locks: Record<string, ElementLock>;
  };
  user: string;
}

export interface ElementLockedMessage extends WebSocketMessage {
  type: "element_locked";
  data: {
    element_id: string;
    user_id: string;
    user_name: string;
  };
}

export interface ElementUnlockedMessage extends WebSocketMessage {
  type: "element_unlocked";
  data: {
    element_id: string;
  };
}

export interface UserListMessage extends WebSocketMessage {
  type: "user_list";
  data: {
    users: string[];
  };
}

export interface UserJoinedMessage extends WebSocketMessage {
  type: "user_joined";
  data: {
    user_name: string;
  };
}

export interface UserLeftMessage extends WebSocketMessage {
  type: "user_left";
  data: {
    user_name: string;
  };
}

export interface LocksUpdateMessage extends WebSocketMessage {
  type: "locks_update";
  data: {
    locks: Record<string, ElementLock>;
  };
}

export type AllWebSocketMessages =
  | DiagramStateMessage
  | DiagramUpdateMessage
  | ElementLockedMessage
  | ElementUnlockedMessage
  | UserListMessage
  | UserJoinedMessage
  | UserLeftMessage
  | LocksUpdateMessage;

/** BPMN-js EventBus types */
export interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  fire(event: string, ...args: any[]): void;
}

export interface ElementClickEvent {
  element: {
    id: string;
    type: string;
    [key: string]: any;
  };
  originalEvent?: Event;
  [key: string]: any;
}

/** BPMN-js Element Registry types */
export interface BpmnElement {
  id: string;
  type: string;
  [key: string]: any;
}

export interface ElementRegistry {
  get(elementId: string): BpmnElement | null;
  getAll(): BpmnElement[];
  filter(fn: (element: BpmnElement) => boolean): BpmnElement[];
  [key: string]: any;
}

/** BPMN-js Canvas types */
export interface Canvas {
  addMarker(elementId: string, marker: string): void;
  removeMarker(elementId: string, marker: string): void;
  hasMarker(elementId: string, marker: string): boolean;
  [key: string]: any;
}

/** BPMN-js Overlays types */
export interface OverlayPosition {
  top: number;
  left: number;
}

export interface OverlayOptions {
  position: OverlayPosition;
  html: string;
}

export interface Overlays {
  add(elementId: string, type: string, options: OverlayOptions): string;
  remove(options: { element: string; type: string }): void;
  get(options: { element: string; type: string }): string | null;
  clear(): void;
  [key: string]: any;
}

export type SelectionChangedEvent = {
  oldSelection?: Array<{ id?: string }>;
  newSelection?: Array<{ id?: string }>;
};

export type EventBusChangeEvent = {
  element?: { id?: string } | null;
  shape?: { id?: string } | null;
  connection?: { id?: string } | null;
  preventDefault: () => void;
  stopPropagation: () => void;
  [key: string]: any;
};
