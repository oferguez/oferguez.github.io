// logs can be found here:
// https://my-own-y55.sentry.io/explore/discover/homepage/?dataset=errors&display=bar&field=title&field=project&field=user.display&field=timestamp&name=All%20Errors&query=&queryDataset=error-events&sort=-timestamp&statsPeriod=1h&yAxis=count%28%29

let sentryInitialized = false;

async function initDevSentry() {
  if (sentryInitialized) return;

  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn: "https://8a13a466114fddf1cbd7e89e9fd4ff34@o4510436378869760.ingest.de.sentry.io/4510436381950032",
    integrations: [Sentry.browserTracingIntegration()], // todo: is it really useful in this setup? if not remove
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
    debug: true,
    release: `ofer_dev`
  });

  Sentry.setTag("debug_mode", "true");
  Sentry.setUser({ username: "Ofer-Dev" });

  sentryInitialized = true;
}

export async function logDevMessage(message, extra = {}) {
  const Sentry = await import("@sentry/react");
  await initDevSentry();
  Sentry.captureMessage(message, {
    level: "info",
    ...extra,
  });
}

export async function logDevError(error, extra = {}) {
  const Sentry = await import("@sentry/react");
  await initDevSentry();
  Sentry.captureException(error, extra);
}
