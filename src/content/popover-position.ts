export const CONTROLLER_VIEWPORT_PADDING = 18;
export const POPOVER_VIEWPORT_PADDING = 12;
export const POPOVER_GAP = 10;

export type Rect = { left: number; top: number; right: number; bottom: number; width: number };

export function clampControllerPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  return {
    x: Math.min(
      Math.max(x, CONTROLLER_VIEWPORT_PADDING),
      viewportWidth - width - CONTROLLER_VIEWPORT_PADDING,
    ),
    y: Math.min(
      Math.max(y, CONTROLLER_VIEWPORT_PADDING),
      viewportHeight - height - CONTROLLER_VIEWPORT_PADDING,
    ),
  };
}

export type PopoverName = 'adjust';

export type PopoverPlacement = {
  left: number;
  top: number;
  side: 'top' | 'bottom';
  originX: number;
};

export function computePopoverPlacement(
  name: PopoverName,
  triggerRect: Rect,
  popoverWidth: number,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): PopoverPlacement {
  const width = popoverWidth || 304;
  const height = popoverHeight || 420;

  let left = triggerRect.right - width;
  let preferredAnchorX = triggerRect.right;

  if (name === 'adjust') {
    left = triggerRect.left + triggerRect.width / 2 - width / 2;
    preferredAnchorX = triggerRect.left + triggerRect.width / 2;
  }

  const clampedLeft = Math.min(
    Math.max(left, POPOVER_VIEWPORT_PADDING),
    viewportWidth - width - POPOVER_VIEWPORT_PADDING,
  );

  const originX = Math.min(
    Math.max(((preferredAnchorX - clampedLeft) / width) * 100, 12),
    88,
  );
  const spaceBelow = viewportHeight - triggerRect.bottom - POPOVER_GAP - POPOVER_VIEWPORT_PADDING;
  const spaceAbove = triggerRect.top - POPOVER_GAP - POPOVER_VIEWPORT_PADDING;
  const openBelow = spaceBelow >= height || spaceBelow >= spaceAbove;
  const top = openBelow
    ? triggerRect.bottom + POPOVER_GAP
    : triggerRect.top - POPOVER_GAP - height;
  const clampedTop = Math.min(
    Math.max(top, POPOVER_VIEWPORT_PADDING),
    viewportHeight - height - POPOVER_VIEWPORT_PADDING,
  );

  return {
    left: clampedLeft,
    top: clampedTop,
    side: openBelow ? 'bottom' : 'top',
    originX,
  };
}
