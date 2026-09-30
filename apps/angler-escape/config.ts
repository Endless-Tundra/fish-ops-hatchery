/**
 * GAME CONFIGURATION
 * 
 * You can easily adjust the game time limit right here!
 *
 * Examples:
 *   600  = 10 minutes
 *   300  = 5 minutes
 *   180  = 3 minutes
 *   120  = 2 minutes
 *   60   = 1 minute
 *   30   = 30 seconds
 */
export const GAME_TIME_LIMIT_SECONDS = 600; // Change this number to any duration in seconds!

/**
 * Helper to display human-readable time limit label (e.g., "10-MINUTE", "3-MINUTE", "45-SECOND")
 */
export function formatTimeLimitLabel(seconds: number = GAME_TIME_LIMIT_SECONDS): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    const mins = Math.floor(seconds / 60);
    return `${mins}-MINUTE`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}M ${secs}S`;
  }
  return `${seconds}-SECOND`;
}
