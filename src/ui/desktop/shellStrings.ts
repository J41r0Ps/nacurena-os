/** One app's strings, already translated and with its name filled in. */
export interface AppStrings {
  readonly title: string;
  readonly body: string;
  readonly pageTitle: string;
  readonly minimise: string;
  readonly maximise: string;
  readonly restore: string;
  readonly close: string;
  readonly minimised: string;
}

/**
 * Plain data, so the client island needs no translation library: the server resolves these while
 * building, in `src/i18n/shellStrings.ts`.
 */
export interface ShellStrings {
  readonly homeTitle: string;
  readonly appsLabel: string;
  readonly openApps: string;
  readonly start: string;
  /** Keyed by AppId. */
  readonly apps: Readonly<Record<string, AppStrings>>;
}
