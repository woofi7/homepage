import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";
import { asJson } from "utils/proxy/api-helpers";
import { httpProxy } from "utils/proxy/http";

const proxyName = "duplicatiProxyHandler";
const logger = createLogger(proxyName);

function parseDuplicatiDate(str) {
  if (!str) return null;
  const m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
}

const DAY_MAP = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// Duplicati's Schedule.Time has the right time-of-day but an unreliable date
// when AllowedDays is set. Compute the true next occurrence ourselves.
function computeNextRun(schedule) {
  if (!schedule?.Time) return null;

  const timeBase = new Date(schedule.Time);
  const h = timeBase.getUTCHours();
  const m = timeBase.getUTCMinutes();
  const s = timeBase.getUTCSeconds();

  const allowedDays = (schedule.AllowedDays ?? [])
    .map((d) => DAY_MAP[d.toLowerCase()])
    .filter((d) => d !== undefined);

  // Fall back to Schedule.Time directly if no AllowedDays configured
  if (allowedDays.length === 0) {
    return timeBase > new Date() ? timeBase : null;
  }

  const now = new Date();
  let earliest = null;

  for (const dayNum of allowedDays) {
    const candidate = new Date(now);
    candidate.setUTCHours(h, m, s, 0);

    const daysUntil = (dayNum - now.getUTCDay() + 7) % 7 || (candidate <= now ? 7 : 0);
    candidate.setUTCDate(candidate.getUTCDate() + daysUntil);

    if (!earliest || candidate < earliest) earliest = candidate;
  }

  return earliest;
}

async function getToken(baseUrl, password) {
  const [status, , data] = await httpProxy(new URL(`${baseUrl}/api/v1/auth/login`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ Password: password }),
  });
  if (status !== 200) throw new Error(`Duplicati login failed: ${status}`);
  const json = asJson(data);
  if (!json?.AccessToken) throw new Error("No access token in Duplicati login response");
  return json.AccessToken;
}

export function buildResponse(backups, serverState) {
  let totalSourceSize = 0;
  let totalDestSize = 0;
  let lastBackupDate = null;
  let lastBackupOk = true;
  let nextBackupDate = null;

  for (const entry of backups) {
    const meta = entry?.Backup?.Metadata ?? {};
    const schedule = entry?.Schedule;

    const lastSuccess = parseDuplicatiDate(meta.LastBackupDate);
    const lastError = parseDuplicatiDate(meta.LastErrorDate);
    const jobHasError = lastError && (!lastSuccess || lastError > lastSuccess);

    // Track the most recent backup and whether it was ok
    if (lastSuccess && (!lastBackupDate || lastSuccess > lastBackupDate)) {
      lastBackupDate = lastSuccess;
      lastBackupOk = !jobHasError;
    }

    const srcSize = parseInt(meta.SourceFilesSize ?? "0", 10);
    if (!Number.isNaN(srcSize)) totalSourceSize += srcSize;

    const dstSize = parseInt(meta.TargetFilesSize ?? "0", 10);
    if (!Number.isNaN(dstSize)) totalDestSize += dstSize;

    const next = computeNextRun(schedule);
    if (next && (!nextBackupDate || next < nextBackupDate)) {
      nextBackupDate = next;
    }
  }

  const activeTasks =
    (serverState?.ActiveTask ? 1 : 0) + (serverState?.SchedulerQueueIds?.length ?? 0);

  return {
    totalJobs: backups.length,
    activeTasks,
    totalSourceSize,
    totalDestSize,
    lastBackupDate: lastBackupDate?.toISOString() ?? null,
    lastBackupOk,
    nextBackupDate: nextBackupDate?.toISOString() ?? null,
  };
}

export default async function duplicatiProxyHandler(req, res) {
  const { group, service, index } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service, index);
  if (!widget) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const authHeaders = { "content-type": "application/json" };

  try {
    const token = await getToken(widget.url, widget.password ?? "");
    authHeaders.Authorization = `Bearer ${token}`;

    const [backupsStatus, , backupsData] = await httpProxy(new URL(`${widget.url}/api/v1/backups`), {
      method: "GET",
      headers: authHeaders,
    });

    if (backupsStatus !== 200) {
      logger.error("Error fetching backups from Duplicati: %d", backupsStatus);
      return res.status(500).json({ error: { message: "Error fetching backups from Duplicati", status: backupsStatus } });
    }

    const [, , serverStateData] = await httpProxy(new URL(`${widget.url}/api/v1/serverstate`), {
      method: "GET",
      headers: authHeaders,
    });

    const backups = asJson(backupsData);
    if (!Array.isArray(backups)) {
      logger.error("Unexpected Duplicati response: %s", JSON.stringify(backups));
      return res.status(500).json({ error: { message: "Unexpected response from Duplicati" } });
    }

    const serverState = asJson(serverStateData);
    return res.status(200).json(buildResponse(backups, serverState));
  } catch (error) {
    logger.error("Exception in Duplicati proxy: %s", error.message);
    return res.status(500).json({ error: "Duplicati proxy error", message: error.message });
  }
}
