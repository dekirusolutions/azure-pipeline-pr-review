import fetch from "node-fetch";
import { git } from "./git";
import { OpenAIApi } from "openai";
import { addCommentToPR } from "./pr";
import { Agent } from "https";
import * as tl from "azure-pipelines-task-lib/task";

export async function reviewFile(
  targetBranch: string,
  fileName: string,
  httpsAgent: Agent,
  apiKey: string | undefined,
  openai: OpenAIApi | undefined,
  aoiEndpoint: string | undefined
) {
  console.log(`Start reviewing ${fileName} ...`);

  const defaultOpenAIModel = "gpt-3.5-turbo";
  const patch = await git.diff([targetBranch, "--", fileName]);

  const instructions =
    tl.getInput("instructions") ||
    `Act as a code reviewer of a Pull Request, providing feedback on possible bugs and clean code issues.
        You are provided with the Pull Request changes in a patch format.
        Each patch entry has the commit message in the Subject line followed by the code changes (diffs) in a unidiff format.

        As a code reviewer, your task is:
                - Review only added, edited or deleted lines.
                - If there's no bugs and the changes are correct, write only 'No feedback.'
                - If there's bug or uncorrect code changes, don't write 'No feedback.'`;

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

      const ten_minutes = 10 * 60 * 1000;

      const controller = new AbortController();

      setTimeout(() => {
        controller.abort();
      }, ten_minutes);

      const payload = {
        max_tokens: 500,
        stream: false,
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

      console.log(`Sending request to ${aoiEndpoint}`, payload);

      const request = await fetch(aoiEndpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      const rawResponse = await request.text();
      console.log(`Request status: ${request.status}`);
      console.log("Raw response: ", rawResponse);

      const response = JSON.parse(rawResponse);

      console.log(response);

      review = response.message.content;
    }

    if (review) {
      if (review.trim() !== "No feedback.") {
        console.log(`Feedback for ${fileName}: ${review}`);
        await addCommentToPR(fileName, review, httpsAgent);
      } else {
        console.log(`No feedback for ${fileName}.`);
      }
    }

    console.log(`Review of ${fileName} completed.`);
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
