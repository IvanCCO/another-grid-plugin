import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bindSliderField,
  createAxisGroup,
  createButton,
  createColorField,
  createIcon,
  createPatternPicker,
  createSliderField,
  getAssetUrl,
  getAxisOption,
  renderAxisGroup,
  renderDistributionGroup,
  updateSliderVisual,
} from './dom-builders';

beforeEach(() => {
  vi.stubGlobal('chrome', {
    runtime: {
      getURL: (path: string) => `chrome-extension://test-id/${path}`,
    },
  });
});

describe('getAssetUrl', () => {
  it('builds an extension-relative asset url', () => {
    expect(getAssetUrl('measure.svg')).toBe('chrome-extension://test-id/assets/measure.svg');
  });
});

describe('getAxisOption', () => {
  it('returns the matching option', () => {
    expect(getAxisOption('rows').label).toBe('Horizontal');
  });

  it('falls back to the first option for an unknown axis', () => {
    expect(getAxisOption('unknown' as never).value).toBe('columns');
  });
});

describe('createIcon', () => {
  it('sets the icon url and rotation as css custom properties', () => {
    const icon = createIcon('grid-2x2.svg', 'grid-ui__icon', 90);
    expect(icon.className).toBe('grid-ui__icon');
    expect(icon.style.getPropertyValue('--grid-icon-url')).toBe(
      'url("chrome-extension://test-id/assets/grid-2x2.svg")',
    );
    expect(icon.style.getPropertyValue('--grid-icon-rotation')).toBe('90deg');
  });
});

describe('createButton', () => {
  it('creates an accessible button that wraps the icon', () => {
    const icon = createIcon('measure.svg', 'grid-ui__icon');
    const button = createButton('Adjust', icon, 'grid-ui__button--primary');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Adjust');
    expect(button.className).toBe('grid-ui__button grid-ui__button--primary');
    expect(button.firstChild).toBe(icon);
  });
});

describe('createSliderField', () => {
  it('wires up min/max/value on the range input', () => {
    const { input, valueEl } = createSliderField('Count', 1, 24, 6);
    expect(input.min).toBe('1');
    expect(input.max).toBe('24');
    expect(input.value).toBe('6');
    expect(valueEl.textContent).toBe('6');
  });
});

describe('updateSliderVisual', () => {
  it('sets the slider percent custom property based on value position', () => {
    const { field, input } = createSliderField('Count', 0, 100, 25);
    updateSliderVisual(input);
    expect(field.style.getPropertyValue('--slider-percent')).toBe('25');
  });

  it('does nothing when the input is not inside a slider field', () => {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = '50';
    expect(() => updateSliderVisual(input)).not.toThrow();
  });
});

describe('bindSliderField', () => {
  it('invokes onChange and updates the output text on input', () => {
    const { input, valueEl } = createSliderField('Opacity', 0, 100, 0);
    const onChange = vi.fn();
    bindSliderField(input, valueEl, onChange, (value) => `${value}%`);

    input.value = '42';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith(42);
    expect(valueEl.textContent).toBe('42%');
  });
});

describe('createColorField', () => {
  it('creates a color input and a linked opacity range', () => {
    const { colorInput, opacityInput, opacityValue } = createColorField();
    expect(colorInput.type).toBe('color');
    expect(opacityInput.type).toBe('range');
    expect(opacityValue.textContent).toBe('12%');
  });
});

describe('createAxisGroup', () => {
  it('renders one button per axis option', () => {
    const group = createAxisGroup();
    expect(group.querySelectorAll('.grid-ui__axis-option')).toHaveLength(3);
  });
});

describe('createPatternPicker', () => {
  it('renders add and select controls with asset-backed icons', () => {
    const picker = createPatternPicker();

    expect(picker.field.querySelectorAll('button')).toHaveLength(2);
    expect(picker.trigger.getAttribute('aria-haspopup')).toBe('menu');
    const chevron = picker.trigger.querySelector(
      '.grid-ui__pattern-trigger-chevron',
    ) as HTMLSpanElement | null;
    expect(chevron?.style.getPropertyValue('--grid-icon-url')).toBe(
      'url("chrome-extension://test-id/assets/chevron.svg")',
    );
  });
});

describe('renderAxisGroup', () => {
  it('marks the active axis button as pressed', () => {
    const group = createAxisGroup();
    renderAxisGroup(group, 'rows');

    const active = group.querySelector('[data-axis="rows"]') as HTMLButtonElement;
    const inactive = group.querySelector('[data-axis="columns"]') as HTMLButtonElement;

    expect(active.dataset.active).toBe('true');
    expect(active.getAttribute('aria-pressed')).toBe('true');
    expect(inactive.dataset.active).toBe('false');
    expect(inactive.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('renderDistributionGroup', () => {
  it('renders only the distribution options supported for the axis', () => {
    const group = document.createElement('div');
    renderDistributionGroup(group, 'grid', 'stretch', vi.fn());
    expect(group.querySelectorAll('.grid-ui__distribution-option')).toHaveLength(2);
  });

  it('marks the current distribution as pressed and calls onSelect on click', () => {
    const group = document.createElement('div');
    const onSelect = vi.fn();
    renderDistributionGroup(group, 'columns', 'left', onSelect);

    const leftButton = group.querySelector('[data-distribution="left"]') as HTMLButtonElement;
    const rightButton = group.querySelector('[data-distribution="right"]') as HTMLButtonElement;
    expect(leftButton.getAttribute('aria-pressed')).toBe('true');
    expect(rightButton.getAttribute('aria-pressed')).toBe('false');

    rightButton.click();
    expect(onSelect).toHaveBeenCalledWith('right');
  });

  it('replaces previous children when re-rendered for a different axis', () => {
    const group = document.createElement('div');
    renderDistributionGroup(group, 'columns', 'stretch', vi.fn());
    renderDistributionGroup(group, 'rows', 'stretch', vi.fn());

    expect(group.querySelector('[data-distribution="left"]')).toBeNull();
    expect(group.querySelector('[data-distribution="top"]')).not.toBeNull();
  });
});
