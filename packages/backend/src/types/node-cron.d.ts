declare module 'node-cron' {
  interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  function schedule(expression: string, func: () => void): ScheduledTask;
  function validate(expression: string): boolean;

  export { schedule, validate, ScheduledTask };
}
