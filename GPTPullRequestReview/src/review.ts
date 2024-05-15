import fetch from "node-fetch";
import { git } from "./git";
import { OpenAIApi } from "openai";
import { addCommentToPR } from "./pr";
import { Agent } from "https";
import * as tl from "azure-pipelines-task-lib/task";
import log from "./log";

type ChatResponse = {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
};

export async function reviewFile(
  targetBranch: string,
  fileName: string,
  httpsAgent: Agent,
  apiKey: string | undefined,
  openai: OpenAIApi | undefined,
  aoiEndpoint: string | undefined
) {
  log.info(`Start reviewing ${fileName} ...`);

  const defaultOpenAIModel = "gpt-3.5-turbo";
  const patch = await git.diff([targetBranch, "--", fileName]);

  const instructions =
    tl.getInput("instructions") ||
    `Act as a code reviewer of a Pull Request, providing feedback on possible bugs and other code issues.
You are provided with the Pull Request changes in a patch format.
Each patch entry has the commit message in the Subject line followed by the code changes (diffs) in a unidiff format.

As a code reviewer, your task is:
- Review only added, edited or deleted lines.
- If there are no bugs and the changes are correct, write only 'No feedback.'
- If there are bugs or incorrect code changes, don't write 'No feedback.'`;

  try {
    let review: string = "";

    if (openai) {
      const response = await openai.createChatCompletion({
        model: tl.getInput("model") || defaultOpenAIModel,
        messages: [
          {
            role: "system",
            content: instructions,
          },
          {
            role: "user",
            content: patch,
          },
        ],
        max_tokens: 500,
      });

      review = response.data.choices[0]?.message?.content ?? "No feedback.";
    } else if (aoiEndpoint) {
      const headers = {
        "Content-Type": "application/json",
      } as { [key: string]: string };

      if (apiKey) {
        headers["api-key"] = apiKey;
      }

      const timeoutValue =
        (parseInt(tl.getInput("timeout") ?? "600") || 600) * 1000;

      log.verbose(`Timeout value: ${timeoutValue}`);

      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, timeoutValue);

      const payload = {
        stream: tl.getBoolInput("stream_data"),
        model: tl.getInput("model") || defaultOpenAIModel,
        messages: [
          {
            role: "system",
            content: instructions,
          },
          {
            role: "user",
            content: patch,
          },
        ],
      };

      log.verbose(`Sending request to ${aoiEndpoint}`, payload);

      const request = await fetch(aoiEndpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      log.verbose(`Request status: ${request.status}`);

      if (!request.ok) {
        throw new Error(
          `Failed to get response from ${aoiEndpoint}: ${await request.text()}`
        );
      }

      if (tl.getBoolInput("stream_data")) {
        const list: string[] = [];
        for await (const chunk of request.body) {
          const parsed = JSON.parse(chunk.toString()) as ChatResponse;
          list.push(parsed.message.content);
        }
        review = list.join("");
      } else {
        const rawResponse = await request.text();
        log.verbose("Raw response: ", rawResponse);

        const response = JSON.parse(rawResponse) as ChatResponse;

        review = response.message.content;
      }
    }

    if (review) {
      if (review.trim() !== "No feedback.") {
        log.verbose(`Feedback for ${fileName}: ${review}`);
        await addCommentToPR(fileName, review, httpsAgent);
      } else {
        log.info(`No feedback for ${fileName}.`);
      }
    }

    log.info(`Review of ${fileName} completed.`);
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
      tl.setResult(tl.TaskResult.Failed, error.response.data);
    } else {
      console.log(error.message);
      tl.setResult(tl.TaskResult.Failed, error.message);
    }
  }
}
