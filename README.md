# Use an LLM to review Pull Requests for Azure DevOps

A task for Azure DevOps build pipelines to add GPT / OpenAI-compatible endpoint as PR reviewer

This is a fork of https://github.com/mlarhrouch/azure-pipeline-gpt-pr-review. We're doing some changes to make the extension more flexible, but there's more work to be done. The primary reason for the fork is that we wish to use it with our self-hosted ollama server, which the original extension does not support.

## Installation

Installation can be done using [Visual Studio MarketPlace](https://marketplace.visualstudio.com/items?itemName=DekiruSolutionsAB.AIPullRequestReview).

_Note: This extension is currently not published to the marketplace._

## Usage

Add the tasks to your build definition.

## Setup

### Give permission to the build service agent

Before using this task, make sure that the build service has permissions to contribute to pull requests in your repository :

![contribute_to_pr](https://github.com/dekirusolutions/azure-pipeline-pr-review/blob/main/images/contribute_to_pr.png?raw=true)

### Allow Task to access the system token

#### YAML pipelines

Add a checkout section with persistCredentials set to true.

```yaml
steps:
  - checkout: self
    persistCredentials: true
```

#### Classic editors

Enable the option "Allow scripts to access the OAuth token" in the "Agent job" properties :

![allow_access_token](https://github.com/dekirusolutions/azure-pipeline-pr-review/blob/main/images/allow_access_token.png?raw=true)

### Azure Open AI service

If you choose to use the Azure Open AI service, you must fill in the endpoint and API key of Azure OpenAI. The format of the endpoint is as follows:

`https://{XXXXXXXX}.openai.azure.com/openai/deployments/{MODEL_NAME}/chat/completions?api-version={API_VERSION}`

If you are instead using an OpenAI-compatible service (such as a self-hosted ollama API), you supply the endpoint and API key of that service.

### Models

You can specify which model to use, if not specified, the default is `gpt-3.5-turbo`.

## Contributions

Found and fixed a bug or improved on something? Contributions are welcome! Please target your pull request against the `main` branch or report an issue on [GitHub](https://github.com/dekirusolutions/azure-pipeline-pr-review/issues) so someone else can try and implement or fix it.

## License

[MIT](https://raw.githubusercontent.com/dekirusolutions/azure-pipeline-pr-review/main/LICENSE)
