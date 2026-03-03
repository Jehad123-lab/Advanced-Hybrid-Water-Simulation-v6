
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const Base = { Unit: { Space: 4, Radius: 4, Time: 100 } };
const px = (value: number) => `${value}px`;

export const spacing = { 'Space.XS': px(Base.Unit.Space * 1), 'Space.S': px(Base.Unit.Space * 2), 'Space.M': px(Base.Unit.Space * 3), 'Space.L': px(Base.Unit.Space * 4), 'Space.XL': px(Base.Unit.Space * 6), 'Space.XXL': px(Base.Unit.Space * 8), 'Space.XXXL': px(Base.Unit.Space * 12) };
export const radius = { 'Radius.S': px(Base.Unit.Radius * 1), 'Radius.M': px(Base.Unit.Radius * 2), 'Radius.L': px(Base.Unit.Radius * 3), 'Radius.XL': px(Base.Unit.Radius * 4), 'Radius.Full': px(9999) };
export const effects = { 'Effect.Shadow.Drop.1': '0 2px 4px rgba(0,0,0,0.1)', 'Effect.Shadow.Drop.2': '0 4px 8px rgba(0,0,0,0.12)', 'Effect.Shadow.Drop.3': '0 8px 16px rgba(0,0,0,0.15)', 'Effect.Shadow.Inset.1': 'inset 0 1px 2px rgba(0,0,0,0.1)' };
export const time = { 'Time.1x': `${Base.Unit.Time * 1}ms`, 'Time.2x': `${Base.Unit.Time * 2}ms`, 'Time.3x': `${Base.Unit.Time * 3}ms`, 'Time.4x': `${Base.Unit.Time * 4}ms`, 'Time.Subtle.1': `${Base.Unit.Time * 1 + 50}ms`, 'Time.Subtle.2': `${Base.Unit.Time * 2 + 50}ms` };
