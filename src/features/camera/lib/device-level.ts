/**
 * Phone levelling maths for the Smart Camera guide (platform independent: iOS and Android report
 * `deviceorientation` the same way, unlike raw accelerometer signs).
 */

export interface DeviceLevel {
  /** Horizon tilt in degrees as seen on screen; 0 = level, positive = phone rolled clockwise. */
  roll: number;
  /** Elevation of the camera direction in degrees; 0 = horizontal, negative = looking down. */
  pitch: number;
}

/**
 * @param beta  `DeviceOrientationEvent.beta`
 * @param gamma `DeviceOrientationEvent.gamma`
 * @param screenAngle `screen.orientation.angle` (0, 90, 180, 270)
 */
export function computeLevel(beta: number, gamma: number, screenAngle: number): DeviceLevel {
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;
  // World "up" expressed in the device frame (x right, y up, z out of the screen).
  const ux = -Math.cos(b) * Math.sin(g);
  const uy = Math.sin(b);
  const uz = Math.cos(b) * Math.cos(g);

  // Rotate into the current screen orientation.
  const a = ((Math.round(screenAngle / 90) % 4) + 4) % 4;
  const [sx, sy] = a === 0 ? [ux, uy] : a === 1 ? [-uy, ux] : a === 2 ? [-ux, -uy] : [uy, -ux];

  const roll = (Math.atan2(sx, sy) * 180) / Math.PI;
  const pitch = (Math.asin(Math.max(-1, Math.min(1, -uz))) * 180) / Math.PI;
  return { roll, pitch };
}

export const LEVEL_ROLL_TOLERANCE = 3;
export const LEVEL_PITCH_RANGE: readonly [number, number] = [-18, 6];

export function isLevel({ roll, pitch }: DeviceLevel): boolean {
  return (
    Math.abs(roll) <= LEVEL_ROLL_TOLERANCE &&
    pitch >= LEVEL_PITCH_RANGE[0] &&
    pitch <= LEVEL_PITCH_RANGE[1]
  );
}
