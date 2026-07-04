import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getDistributionOptions,
  getFixedTrackSpan,
  getSizeLabel,
  normalizeSettings,
  toRgba,
} from './utils';

describe('normalizeSettings', () => {
  it('returns defaults when the payload is invalid', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('normalizes row settings and keeps only supported distributions', () => {
    expect(
      normalizeSettings({
        visible: false,
        toolbarX: '128',
        toolbarY: 44,
        axis: 'rows',
        distribution: 'bottom',
        count: '5',
        opacity: '24',
      }),
    ).toMatchObject({
      visible: false,
      toolbarX: 128,
      toolbarY: 44,
      axis: 'rows',
      distribution: 'bottom',
      count: 5,
      opacity: 24,
    });
  });

  it('falls back when the distribution does not exist for the axis', () => {
    expect(
      normalizeSettings({
        axis: 'rows',
        distribution: 'left',
      }),
    ).toMatchObject({
      axis: 'rows',
      distribution: 'stretch',
    });
  });

  it('supports the square grid mode', () => {
    expect(
      normalizeSettings({
        axis: 'grid',
        distribution: 'center',
      }),
    ).toMatchObject({
      axis: 'grid',
      distribution: 'center',
    });
  });
});

describe('grid metadata', () => {
  it('returns the correct label and options for each axis', () => {
    expect(getSizeLabel('columns')).toBe('Width');
    expect(getSizeLabel('rows')).toBe('Height');
    expect(getSizeLabel('grid')).toBe('Cell');
    expect(getDistributionOptions('columns').map(({ value }) => value)).toEqual([
      'stretch',
      'center',
      'left',
      'right',
    ]);
    expect(getDistributionOptions('rows').map(({ value }) => value)).toEqual([
      'stretch',
      'center',
      'top',
      'bottom',
    ]);
    expect(getDistributionOptions('grid').map(({ value }) => value)).toEqual([
      'stretch',
      'center',
    ]);
  });

  it('computes fixed spans and overlay colors', () => {
    expect(
      getFixedTrackSpan({
        ...DEFAULT_SETTINGS,
        count: 4,
        size: 80,
        gutter: 16,
      }),
    ).toBe(368);
    expect(toRgba('#FF0000', 10)).toBe('rgba(255, 0, 0, 0.1)');
  });
});
