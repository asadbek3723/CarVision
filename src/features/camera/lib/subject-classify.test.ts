import { describe, expect, it } from 'vitest';
import { classifyFrame, createSubjectSmoother } from './subject-classify';

describe('classifyFrame', () => {
  it('a car in frame is "car"', () => {
    expect(classifyFrame([{ label: 'car', score: 0.8, area: 0.5 }])).toBe('car');
  });

  it('trucks and buses count as the car', () => {
    expect(classifyFrame([{ label: 'truck', score: 0.6, area: 0.4 }])).toBe('car');
    expect(classifyFrame([{ label: 'bus', score: 0.6, area: 0.4 }])).toBe('car');
  });

  it('a person in frame is "person"', () => {
    expect(classifyFrame([{ label: 'person', score: 0.9, area: 0.3 }])).toBe('person');
  });

  it('anything else, or nothing, is "other"', () => {
    expect(classifyFrame([{ label: 'chair', score: 0.9, area: 0.3 }])).toBe('other');
    expect(classifyFrame([])).toBe('other');
  });

  it('the most prominent object decides', () => {
    const personInFrontOfCar = [
      { label: 'car', score: 0.7, area: 0.15 },
      { label: 'person', score: 0.9, area: 0.45 },
    ];
    expect(classifyFrame(personInFrontOfCar)).toBe('person');
    const carWithPasserBy = [
      { label: 'car', score: 0.8, area: 0.6 },
      { label: 'person', score: 0.9, area: 0.08 },
    ];
    expect(classifyFrame(carWithPasserBy)).toBe('car');
  });

  it('ignores weak and tiny detections', () => {
    expect(classifyFrame([{ label: 'car', score: 0.2, area: 0.6 }])).toBe('other');
    expect(classifyFrame([{ label: 'person', score: 0.9, area: 0.01 }])).toBe('other');
  });
});

describe('createSubjectSmoother', () => {
  it('does not flip on a single odd frame', () => {
    const smooth = createSubjectSmoother(4);
    expect(smooth('car')).toBe('car');
    smooth('car');
    smooth('car');
    expect(smooth('person')).toBe('car');
  });

  it('switches once the new subject holds the majority', () => {
    const smooth = createSubjectSmoother(4);
    smooth('car');
    smooth('person');
    smooth('person');
    expect(smooth('person')).toBe('person');
  });
});
