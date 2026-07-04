import { describe, expect, it } from 'vitest';
import {
  CONTROLLER_VIEWPORT_PADDING,
  POPOVER_GAP,
  POPOVER_VIEWPORT_PADDING,
  clampControllerPosition,
  computePopoverPlacement,
} from './popover-position';

describe('clampControllerPosition', () => {
  it('keeps the position unchanged when it fits within the viewport', () => {
    expect(clampControllerPosition(100, 100, 50, 30, 1000, 800)).toEqual({ x: 100, y: 100 });
  });

  it('clamps to the minimum padding when the position is negative', () => {
    expect(clampControllerPosition(-50, -50, 50, 30, 1000, 800)).toEqual({
      x: CONTROLLER_VIEWPORT_PADDING,
      y: CONTROLLER_VIEWPORT_PADDING,
    });
  });

  it('clamps to the far edge minus size and padding when it overflows', () => {
    expect(clampControllerPosition(10000, 10000, 50, 30, 1000, 800)).toEqual({
      x: 1000 - 50 - CONTROLLER_VIEWPORT_PADDING,
      y: 800 - 30 - CONTROLLER_VIEWPORT_PADDING,
    });
  });
});

describe('computePopoverPlacement', () => {
  const viewportWidth = 1000;
  const viewportHeight = 800;

  it('centers the popover under a trigger near the top of the viewport', () => {
    const triggerRect = { left: 480, top: 20, right: 520, bottom: 50, width: 40 };
    const placement = computePopoverPlacement(
      'adjust',
      triggerRect,
      300,
      400,
      viewportWidth,
      viewportHeight,
    );

    expect(placement.side).toBe('bottom');
    expect(placement.top).toBe(50 + POPOVER_GAP);
    expect(placement.left).toBe(480 + 20 - 150);
  });

  it('flips above the trigger when there is more room above than below', () => {
    const triggerRect = { left: 480, top: 760, right: 520, bottom: 790, width: 40 };
    const placement = computePopoverPlacement(
      'adjust',
      triggerRect,
      300,
      400,
      viewportWidth,
      viewportHeight,
    );

    expect(placement.side).toBe('top');
    expect(placement.top).toBe(760 - POPOVER_GAP - 400);
  });

  it('clamps left/top so the popover never overflows the viewport edges', () => {
    const triggerRect = { left: 0, top: 0, right: 20, bottom: 20, width: 20 };
    const placement = computePopoverPlacement(
      'adjust',
      triggerRect,
      300,
      400,
      viewportWidth,
      viewportHeight,
    );

    expect(placement.left).toBe(POPOVER_VIEWPORT_PADDING);
  });

  it('falls back to default width/height when measurements are zero', () => {
    const triggerRect = { left: 480, top: 20, right: 520, bottom: 50, width: 40 };
    const placement = computePopoverPlacement(
      'adjust',
      triggerRect,
      0,
      0,
      viewportWidth,
      viewportHeight,
    );

    expect(placement.left).toBe(480 + 20 - 304 / 2);
  });

  it('keeps the transform origin within the 12-88 percent bounds', () => {
    const triggerRect = { left: 0, top: 20, right: 10, bottom: 50, width: 10 };
    const placement = computePopoverPlacement(
      'adjust',
      triggerRect,
      300,
      400,
      viewportWidth,
      viewportHeight,
    );

    expect(placement.originX).toBeGreaterThanOrEqual(12);
    expect(placement.originX).toBeLessThanOrEqual(88);
  });
});
