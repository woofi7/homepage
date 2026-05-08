import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next";

import useWidgetAPI from "utils/proxy/use-widget-api";

const DEFAULT_FIELDS = ["last_backup", "next_backup", "source_size", "dest_size"];
const MAX_FIELDS = 5;

function formatDate(isoString, ok) {
  if (!isoString) return "—";
  const date = new Date(isoString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return ok === undefined ? date : `${date} · ${ok ? "OK" : "Error"}`;
}

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;

  const { data, error } = useWidgetAPI(widget, "backups");

  if (error) {
    return <Container service={service} error={error} />;
  }

  const fields = widget.fields?.length ? widget.fields.slice(0, MAX_FIELDS) : DEFAULT_FIELDS;

  if (!data) {
    return (
      <Container service={service}>
        <Block label="duplicati.last_backup" />
        <Block label="duplicati.next_backup" />
        <Block label="duplicati.active_tasks" />
        <Block label="duplicati.source_size" />
        <Block label="duplicati.dest_size" />
      </Container>
    );
  }

  return (
    <Container service={service}>
      {fields.includes("last_backup") && (
        <Block label="duplicati.last_backup" value={formatDate(data.lastBackupDate, data.lastBackupOk)} />
      )}
      {fields.includes("next_backup") && (
        <Block label="duplicati.next_backup" value={formatDate(data.nextBackupDate)} />
      )}
      {fields.includes("active_tasks") && (
        <Block label="duplicati.active_tasks" value={t("common.number", { value: data.activeTasks })} />
      )}
      {fields.includes("source_size") && (
        <Block label="duplicati.source_size" value={t("common.bytes", { value: data.totalSourceSize })} />
      )}
      {fields.includes("dest_size") && (
        <Block label="duplicati.dest_size" value={t("common.bytes", { value: data.totalDestSize })} />
      )}
    </Container>
  );
}
