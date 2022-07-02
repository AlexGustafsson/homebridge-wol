import { promisify } from "util";
import { exec as execSync } from "child_process";

import wol, { WakeOptions } from "wake_on_lan";

/** An async version of Node's {@link exec}. */
export const exec = promisify(execSync);

/**
 * Send WoL magic packets.
 * @param macAddress The MAC address of the target.
 * @param options Options to use.
 */
export function wake(macAddress: string, options: WakeOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    wol.wake(macAddress, options, (error: Error) => {
      if (error) return reject(error);

      resolve();
    });
  });
}

/**
 * Wait for the specified number of milliseconds.
 * @param milliseconds The number of milliseconds to wait.
 */
export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
