import duplicatiProxyHandler from "./proxy";

const widget = {
  api: "{url}/api/v1/{endpoint}",
  proxyHandler: duplicatiProxyHandler,

  mappings: {
    backups: {
      endpoint: "backups",
    },
  },
};

export default widget;
