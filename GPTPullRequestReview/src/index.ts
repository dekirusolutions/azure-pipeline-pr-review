import * as tl from "azure-pipelines-task-lib/task";
import { Configuration, OpenAIApi } from "openai";
import { deleteExistingComments } from "./pr";
import { reviewFile } from "./review";
import { getTargetBranchName } from "./utils";
import { getChangedFiles } from "./git";
import https from "https";

async function run() {
  try {
    if (tl.getVariable("Build.Reason") !== "PullRequest") {
      tl.setResult(
        tl.TaskResult.Skipped,
        "This task should be run only when the build is triggered from a Pull Request."
      );
      return;
    }

    let openai: OpenAIApi | undefined;
    const supportSelfSignedCertificate = tl.getBoolInput(
      "support_self_signed_certificate"
    );

    const apiKey = tl.getInput("api_key");
    const aoiEndpoint = tl.getInput("aoi_endpoint");

    if (aoiEndpoint === undefined) {
      if (apiKey === undefined) {
        tl.setResult(tl.TaskResult.Failed, "No API key provided!");
        return;
      }

      const openAiConfiguration = new Configuration({
        apiKey: apiKey,
      });

      openai = new OpenAIApi(openAiConfiguration);
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !supportSelfSignedCertificate,
    });

    let targetBranch = getTargetBranchName();

    if (!targetBranch) {
      tl.setResult(tl.TaskResult.Failed, "No target branch found!");
      return;
    }

    const filesNames = await getChangedFiles(targetBranch);

    if (filesNames.length === 0) {
      tl.setResult(tl.TaskResult.Skipped, "No files to review.");
      return;
    }

    for (const fileName of filesNames) {
      console.log(`File changed: ${fileName}`);
    }

    await deleteExistingComments(httpsAgent);

    for (const fileName of filesNames) {
      await reviewFile(
        targetBranch,
        fileName,
        httpsAgent,
        apiKey,
        openai,
        aoiEndpoint
      );
    }

    console.log("Pull Request reviewed.");
    tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.", true);
  } catch (err: any) {
    console.error(err.message);
    tl.setResult(tl.TaskResult.Failed, err.message, true);
  }
}

run();
