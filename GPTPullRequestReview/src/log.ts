import * as tl from "azure-pipelines-task-lib/task";

const logger = (() => {
  return {
    verbose: !tl.getBoolInput("debug_log") ? () => {} : console.log,
    info: console.log,
  };
})();

export default logger;
