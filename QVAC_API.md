---
title: "API Summary — v0.22.x (latest)"
canonical: https:collection: "SDK"
package: "@qvacline: v0.22
current_line: true
---

# API Summary — v0.22.x (latest) (


> Auto-generated from `.d.ts` declarations and TSDoc comments.
>
> For per-parameter and per-field details, hover symbols in your IDE or open
> `node_modules>
> **Fields shown**: description, signature, throws, examples, deprecation, prototype.
> **Fields intentionally omitted**: parameter descriptions, return field descriptions
> (covered by IDE hover and `.d.ts` declarations).
>
> **Scope**: 61 functions in `packages
***

## Functions

### `assessModelFit`

Assesses, before anything is downloaded, whether the given models are likely
to fit in this device's memory.

Advisory only: it does not download weights, block `loadModel`, reserve
memory, or make a performance claim. `unknown` is a real answer — it means
the available evidence does not support a verdict either way, and callers
should treat it as "cannot say", not "no".

For each candidate it fetches the registry's weightless description of every
source that load names — tens of KB each, never the weights — and runs the
engine's own fitter against them, reported as `native-fit` evidence. Where
that is unavailable the computed floor stands, which can refuse a model but
never confirm one.

**Signature**:

```ts
function assessModelFit(input: AssessModelFitInput): Promise<AssessModelFitResult>;
```

***

### `audioEdit`

Edits a source recording with a loaded ACE-Step AudioGen model: an ordered
pipeline of `flow-edit` and `repaint` operations, executed in array order.

**Signature**:

```ts
function audioEdit(params: AudioEditClientParams): AudioGenResult;
```

**Example**:

```ts
const run = audioEdit({
  modelId,
  sourceAudio: "  operations: [
    {
      type: "flow-edit",
      from: { caption: "original pop song", lyrics: originalLyrics },
      to: { caption: "guitar pop-rock", lyrics: newLyrics },
    },
    { type: "repaint", caption: "analog synth solo", start: 10, end: 20, mode: "balanced" },
  ],
  seed: 22883,
  referenceAudio: "  bpm: 120,
  keyscale: "C minor",
});
stopButton.onclick = () => cancel({ requestId: run.requestId });
const { pcm, sampleRate, channels, bitsPerSample } = await run.audio;
```

***

### `audioGen`

Generates PCM audio using a loaded AudioGen model.

**Signature**:

```ts
function audioGen(params: AudioGenClientParams): AudioGenResult;
```

**Example**:

```ts
const modelId = await loadModel({
  modelType: "audiogen",
  modelConfig: {
    textEncModelSrc,
    lmModelSrc,
    ditModelSrc,
    vaeModelSrc,
  },
});
const run = audioGen({ modelId, caption: "ambient electronic music", duration: 10 });
stopButton.onclick = () => cancel({ requestId: run.requestId });
for await (const progress of run.progressStream) {
  console.log(progress.stage, progress.step, progress.total);
}
const { pcm, sampleRate, channels, bitsPerSample } = await run.audio;
const stats = await run.stats;

const minimaxId = await loadModel({
  modelType: "audiogen",
  modelConfig: {
    engine: "minimax",
    lmModelSrc: "    synthModelSrc: "    device: "gpu",   },
});
const minimaxRun = audioGen({
  modelId: minimaxId,
  caption: "warm cinematic piano",
  maxFrames: 250,
  inferenceSteps: 12,
  cfgScale: 1.8,
});

const cover = audioGen({
  modelId,
  caption: "orchestral arrangement with dramatic strings",
  taskType: "cover-nofsq",
  sourceAudio: "  referenceAudio: "  coverNoiseStrength: 0.75,
});

const assisted = audioGen({
  modelId,
  caption: "a hopeful indie track for a road-trip montage",
  simpleMode: true,
  generateLrc: true,
  computeQualityScore: true,
});
const { lrc, lyricsScore, qualityScore } = (await assisted.stats) ?? {};

const rendered = (await assisted.stats)?.metadata;
console.log(rendered?.caption, rendered?.lyrics, rendered?.bpm, rendered?.seed);

const newDrums = audioGen({
  modelId,
  caption: "the same song with a busier, live-sounding kit",
  taskType: "lego",
  track: "drums",
  sourceAudio: "});
```

***

### `audioUnderstand`

Describes a recording with a loaded ACE-Step AudioGen model, running the
engine's reverse pipeline: the PCM is encoded, its FSQ semantic codes are
recovered, and the LM reports a caption and the clip's metadata.

**Signature**:

```ts
function audioUnderstand(params: AudioUnderstandClientParams): AudioUnderstandResult;
```

**Example**:

```ts
const run = audioUnderstand({ modelId, sourceAudio: "stopButton.onclick = () => cancel({ requestId: run.requestId });
const { caption, bpm, keyscale, timesignature, audioCodes } = await run.description;

const remake = audioGen({ modelId, caption: "the same song, brighter mix", audioCodes });
```

***

### `batchCompletion`

Runs multiple prompts concurrently through one loaded model.

The returned run exposes the request ID immediately, a merged event stream,
ordered results, aggregate batch statistics, and per-prompt streams via
`byId()`. Stream-level failures reject the aggregate promises; individual
terminal failures are also exposed through the corresponding `byId().final`.

**Signature**:

```ts
function batchCompletion(params: BatchCompletionParams): BatchCompletionRun;
```

***

### `bciTranscribe`

Has 2 overloads.

#### Overload 1

Transcribe a neural-signal buffer with a loaded BCI model and return the
complete text. Accepts either a `.bin` file path or a raw neural buffer.

**Signature**:

```ts
function bciTranscribe(params: any, options?: RPCOptions): Promise<TranscribeSegment[]> & { requestId: string };
```

#### Overload 2

Transcribe a neural-signal buffer with a loaded BCI model and return the
complete text. Accepts either a `.bin` file path or a raw neural buffer.

**Signature**:

```ts
function bciTranscribe(params: BciTranscribeClientParams, options?: RPCOptions): Promise<string> & { requestId: string };
```

***

### `bciTranscribeStream`

Has 2 overloads.

#### Overload 1

Opens a bidirectional streaming BCI transcription session. Neural-signal
chunks are streamed in via `write()`, and transcription is yielded as the
addon's sliding window decodes successive windows.

The returned session is single-use. Attempting to iterate a second time
will throw a `TranscriptionFailedError`.

**Signature**:

```ts
function bciTranscribeStream(params: any, options?: RPCOptions): Promise<BciTranscribeStreamMetadataSession>;
```

#### Overload 2

Opens a bidirectional streaming BCI transcription session. Neural-signal
chunks are streamed in via `write()`, and transcription is yielded as the
addon's sliding window decodes successive windows.

The returned session is single-use. Attempting to iterate a second time
will throw a `TranscriptionFailedError`.

**Signature**:

```ts
function bciTranscribeStream(params: BciTranscribeStreamClientParams, options?: RPCOptions): Promise<BciTranscribeStreamSession>;
```

***

### `cancel`

Cancels an ongoing operation.

Two cancel paths are supported:

* **By `requestId`** (primary) — pass the `requestId` exposed on
  the result of a long-running call (`completion(...)`,
  `loadModel(...)`, `downloadAsset(...)`, `embed(...)`,
  `transcribe(...)`, `ragIngest(...)`, etc.) to cancel exactly
  that request. A cancel that races the originating call is
  recorded and applied retroactively when the begin arrives.
* **Broad by `modelId`** (escape hatch) — `{ modelId, kind? }`
  cancels every in-flight request on that model. Useful for
  model unload, app shutdown, or admin sweeps where the caller
  doesn't have a `requestId` to hand.

The legacy `{ operation: "inference" | "embeddings", modelId }`
sugars remain callable for source compatibility. For migration off
the removed `{ operation: "downloadAsset" | "rag" }` shapes, see
the 0.11.0 changelog 
**Signature**:

```ts
function cancel(params: CancelClientInput): Promise<void>;
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid or the cancellation fails.

**Examples**:

```ts
const run = completion({ ... });
await cancel({ requestId: run.requestId });
```

```ts
await cancel({ modelId: "model-123", kind: "completion" });
```

***

### `classify`

Classifies an image using a loaded classification model.

The bundled MobileNetV3-Small model produces 3 labels: `"food"`, `"report"`, `"other"`.
Custom models may emit different labels sourced from the GGUF metadata.

**Signature**:

```ts
function classify(params: ClassifyClientParams): Promise<ClassificationResult[]>;
```

**Example**:

```ts
const modelId = await loadModel({ modelType: "ggml-classification" });
const jpeg = fs.readFileSync("photo.jpg");
const results = await classify({ modelId, image: jpeg });
await unloadModel({ modelId });
```

***

### `completion`

Generates completion from a language model based on conversation history.

Returns a `CompletionRun` whose canonical surfaces are:

* `events`  — `AsyncIterable<CompletionEvent>` of ordered, typed events.
* `final`   — `Promise<CompletionFinal>` with aggregated results once the
  stream ends (content, thinking, tool calls, stats, raw text).

Legacy convenience fields (`tokenStream`, `text`, `toolCallStream`,
`toolCalls`, `stats`) are still available but deprecated — they derive
from `events` 
**Signature**:

```ts
function completion(params: CompletionParams): CompletionRun;
```

**Example**:

```ts
import { z } from "zod";

const run = completion({
  modelId: "llama-2",
  history: [
    { role: "user", content: "What's the weather in Tokyo?" }
  ],
  stream: true,
  captureThinking: true,
  tools: [{
    name: "get_weather",
    description: "Get current weather",
    parameters: z.object({
      city: z.string().describe("City name"),
    }),
    handler: async (args) => {
      return { temperature: 22, condition: "sunny" };
    }
  }]
});

for await (const event of run.events) {
  if (event.type === "contentDelta") process.stdout.write(event.text);
  if (event.type === "toolCall") console.log(event.call.name, event.call.arguments);
}

const result = await run.final;
for (const toolCall of await result.toolCalls) {
  if (toolCall.invoke) {
    const toolResult = await toolCall.invoke();
    console.log(toolResult);
  }
}
```

***

### `createVectorIndex`

Creates an empty vector index in worker memory and returns a handle to it.

The index is backed by the native TurboVec engine of the registered
embedding plugin (the built-in llama.cpp embedding plugin provides it).
Pair it with `embed()` to build retrieval over documents kept in any store:
add each document's embedding under an id of your choosing, then search
with the embedding of a query and map the returned ids back to your
documents.

**Signature**:

```ts
function createVectorIndex(params: CreateVectorIndexParams, options?: RPCOptions): Promise<VectorIndex>;
```

**Throws**:

* `VectorIndexProviderUnavailableError` — When no registered plugin exposes a vector index provider
* `VectorIndexFailedError` — When the native index rejects the dimension or storage mode

**Example**:

```ts
const documents = new Map([
  ['1', 'Saturn moon Titan has lakes of liquid methane.'],
  ['2', 'Solar panels turn sunlight into electricity.']
])
const { embedding } = await embed({ modelId, text: [...documents.values()] })

await using index = await createVectorIndex({ dim: embedding[0].length })
await index.add({ ids: [...documents.keys()], vectors: embedding })

const { embedding: query } = await embed({ modelId, text: 'Which moon has methane lakes?' })
const hits = await index.search({ query, k: 1 })
console.log(documents.get(hits[0].id))
```

***

### `decide`

Has 3 overloads.

#### Overload 1

Answers typed decision questions about one state or a batch of states.

**Signature**:

```ts
function decide(params: Extract<DecideParams, { state: unknown }>, options?: RPCOptions): Promise<DecisionResult> & { requestId: string };
```

**Throws**:

* `RequestValidationFailedError` — If the request is invalid.
* `InferenceCancelledError` — If the request is cancelled.
* `RequestRejectedByPolicyError` — If this model's decision queue is full.
* `InvalidResponseError` — If the worker returns a malformed result.

#### Overload 2

Answers typed decision questions about one state or a batch of states.

**Signature**:

```ts
function decide(params: Extract<DecideParams, { states: unknown }>, options?: RPCOptions): Promise<DecisionResult[]> & { requestId: string };
```

**Throws**:

* `RequestValidationFailedError` — If the request is invalid.
* `InferenceCancelledError` — If the request is cancelled.
* `RequestRejectedByPolicyError` — If this model's decision queue is full.
* `InvalidResponseError` — If the worker returns a malformed result.

#### Overload 3

Answers typed decision questions about one state or a batch of states.

**Signature**:

```ts
function decide(params: DecideParams, options?: RPCOptions): Promise<DecisionResponse> & { requestId: string };
```

**Throws**:

* `RequestValidationFailedError` — If the request is invalid.
* `InferenceCancelledError` — If the request is cancelled.
* `RequestRejectedByPolicyError` — If this model's decision queue is full.
* `InvalidResponseError` — If the worker returns a malformed result.

***

### `deleteCache`

Deletes KV cache files.

**Signature**:

```ts
function deleteCache(params: { all: true } | { auto: true } | { kvCacheKey: string; modelId?: string }): Promise<{ success: any }>;
```

**Throws**:

* `QvacErrorBase` — When the cache parameters are invalid (`InvalidDeleteCacheParamsError`) or the server reports a delete failure (`DeleteCacheFailedError`).

**Example**:

```ts
await deleteCache({ all: true });

await deleteCache({ auto: true });

await deleteCache({ kvCacheKey: "my-session" });

await deleteCache({ kvCacheKey: "my-session", modelId: "model-abc123" });
```

***

### `diffusion`

Generates images using a loaded diffusion model.

**Signature**:

```ts
function diffusion(params: DiffusionClientParams): DiffusionResult;
```

**Example**:

```ts
const { outputs, stats } = diffusion({ modelId, prompt: "a cat" });
const buffers = await outputs;
fs.writeFileSync("output.png", buffers[0]);

const initImage = fs.readFileSync("input.png");
const { outputs } = diffusion({ modelId, prompt: "oil painting style", init_image: initImage, strength: 0.7 });

const { outputs } = diffusion({ modelId, prompt: "turn into watercolor", init_image: initImage });

const refA = fs.readFileSync("scientist-a.jpg");
const refB = fs.readFileSync("scientist-b.jpg");
const { outputs } = diffusion({
  modelId,
  prompt: "a portrait using most visual traits from @image1 and the eyes from @image2",
  init_images: [refA, refB],
  width: 768,
  height: 768,
});

const { outputs } = diffusion({
  modelId,
  prompt: "a watercolor cat",
  lora: "});

const { outputs: singleOutputs } = diffusion({
  modelId,
  prompt: "a fox portrait",
  width: 128,
  height: 128,
  upscale: true, });
const single = await singleOutputs;
fs.writeFileSync("upscaled.png", single[0]);

const { outputs: hiresOutputs } = diffusion({
  modelId,
  prompt: "a fox portrait",
  width: 128,
  height: 128,
  upscale: { repeats: 2 },
});
const hires = await hiresOutputs;
fs.writeFileSync("hires.png", hires[0]);

const { progressStream, outputs } = diffusion({ modelId, prompt: "a cat" });
for await (const { step, totalSteps } of progressStream) {
  console.log(`${step}}
const buffers = await outputs;
```

***

### `discoverRpcServers`

Find private-network candidates with device inventories and server RDMA availability.
RDMA availability is a server-side offer, not a guarantee of the negotiated transport.
Use getRpcDeviceMap with the chosen endpoint registration order before loadModel.
Cancel a pending search with its promise.requestId.

**Signature**:

```ts
function discoverRpcServers(options: DiscoverRpcServersOptions): Promise<RpcServerCandidate[]> & { requestId: string };
```

***

### `downloadAsset`

Downloads an asset (model file) without loading it into memory.

This function is specifically designed for download-only operations and
doesn't accept runtime configuration options like modelConfig.
Use this for download-only operations instead of loadModel for better semantic clarity.

**Signature**:

```ts
function downloadAsset(options: DownloadAssetOptions, rpcOptions?: RPCOptions): Promise<string> & { requestId: string };
```

**Throws**:

* `QvacErrorBase` — When asset download fails, with details in the error message
* `QvacErrorBase` — When streaming ends unexpectedly (only when using onProgress)
* `QvacErrorBase` — When receiving an invalid response type from the server

**Example**:

```ts
const assetId = await downloadAsset({
  assetSrc: "  seed: true
});

const assetId = await downloadAsset({
  assetSrc: "pear:  onProgress: (progress) => {
    console.log(`Downloaded: ${progress.percentage}%`);
  }
});

const op = downloadAsset({ assetSrc: "https:setTimeout(() => cancel({ requestId: op.requestId }), 1000);
await op; ```

***

### `embed`

Has 2 overloads.

#### Overload 1 — Single text

Generates embeddings for a single text using a specified model.

**Signature**:

```ts
function embed(params: { modelId: string; text: string }, options?: RPCOptions): Promise<{ embedding: number[]; stats?: any }> & { requestId: string };
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid or when the embedding fails

#### Overload 2 — Multiple texts

Generates embeddings for multiple texts using a specified model.

**Signature**:

```ts
function embed(params: { modelId: string; text: string[] }, options?: RPCOptions): Promise<{ embedding: number[][]; stats?: any }> & { requestId: string };
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid or when the embedding fails

***

### `finetune`

Has 2 overloads.

#### Overload 1 — Run 
Run `progressStream` and a terminal `result` promise.

**Signature**:

```ts
function finetune(params: FinetuneRunParams, rpcOptions?: RPCOptions): FinetuneHandle;
```

#### Overload 2 — Stop 
Stop 
**Signature**:

```ts
function finetune(params: FinetuneReplyParams, rpcOptions?: RPCOptions): Promise<FinetuneResult>;
```

***

### `getLoadedModelInfo`

Returns introspection info for a loaded `modelId`.

`info.modelType` and `info.handlers` are authoritative. Use them to preflight
an SDK call before sending the actual RPC, e.g. confirm that a model supports
`transcribeStream` before calling `transcribe()`.

Throws `ModelNotFoundError` if no entry exists for `modelId`.

**Signature**:

```ts
function getLoadedModelInfo(params: GetLoadedModelInfoParams, rpcOptions?: RPCOptions): Promise<LoadedModelInfo>;
```

**Throws**:

* `InvalidResponseError` — When the worker returns an unexpected response.
* `ModelNotFoundError` — When no loaded model has the requested ID.

**Example**:

```ts
const info = await getLoadedModelInfo({ modelId });
if (info.handlers.includes("completionStream")) {
  }
```

***

### `getModelInfo`

Returns status information for a catalog model, including cache state and loaded instances.

**Signature**:

```ts
function getModelInfo(params: GetModelInfoParams): Promise<ModelInfo>;
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid (`InvalidResponseError`) or the RPC layer fails.

***

### `getSystemResources`

Read the worker's system capabilities and optional resource sample.

**Signature**:

```ts
function getSystemResources(input?: GetSystemResourcesInput): Promise<SystemResources>;
```

**Throws**:

* `InvalidResponseError` — If the worker returns a different response type.
* `Error` — If the RPC request fails.

***

### `heartbeat`

Checks whether the local SDK worker is responsive by sending a heartbeat
round-trip.

**Signature**:

```ts
function heartbeat(): Promise<HeartbeatResponse>;
```

**Throws**:

* `QvacErrorBase` — When the response is invalid.

**Example**:

```ts
await heartbeat();
```

***

### `invokePlugin`

Invoke a non-streaming plugin handler.

**Signature**:

```ts
function invokePlugin(options: InvokePluginOptions<TParams>, rpcOptions?: RPCOptions): Promise<TResponse>;
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid (`InvalidResponseError`) or the RPC layer fails.

***

### `invokePluginStream`

Invoke a streaming plugin handler.

**Signature**:

```ts
function invokePluginStream(options: InvokePluginOptions<TParams>, rpcOptions?: RPCOptions): AsyncGenerator<TResponse>;
```

**Throws**:

* `QvacErrorBase` — When an intermediate response has the wrong type (`InvalidResponseError`) or the RPC layer fails.

***

### `loadModel`

Has 4 overloads.

#### Overload 1 — From descriptor

Loads a model from a descriptor; `modelType` is inferred from `modelSrc`.
`modelConfig` narrows per-engine when `modelSrc.engine` is a literal,
otherwise falls back to a permissive shape.

**Signature**:

```ts
function loadModel(options: LoadModelDescriptorParam<S>, rpcOptions?: RPCOptions): Promise<string> & { requestId: string };
```

**Throws**:

* `ModelTypeRequiredError` — When `modelType` cannot be inferred from `modelSrc` at runtime.

**Example**:

```ts
await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelConfig: { ctx_size: 2048 } });
await loadModel({ modelSrc: WHISPER_TINY });
```

#### Overload 2 — Load new model

Loads a machine learning model from a local path, remote URL, or Hyperdrive key.

This function supports multiple model types: LLM (Large Language Model), Whisper (speech recognition),
embeddings, NMT (translation), and TTS. It can handle both local file paths and Hyperdrive URLs (pear:
When `onProgress` is provided, the function uses streaming to provide real-time download progress.
Otherwise, it uses a simple request-response pattern for faster execution.

**Signature**:

```ts
function loadModel(options: LoadModelOptions, rpcOptions?: RPCOptions): Promise<string> & { requestId: string };
```

**Throws**:

* `QvacErrorBase` — When model loading fails, with details in the error message
* `QvacErrorBase` — When streaming ends unexpectedly (only when using onProgress)
* `QvacErrorBase` — When receiving an invalid response type from the server

**Example**:

```ts
const localModelId = await loadModel({
  modelSrc: "  modelType: "llamacpp-completion",
  modelConfig: { ctx_size: 2048 }
});

const relativeModelId = await loadModel({
  modelSrc: ".  modelType: "whispercpp-transcription"
});

const hyperdriveId = await loadModel({
  modelSrc: "pear:  modelType: "llamacpp-completion",
  modelConfig: { ctx_size: 2048 }
});

const remoteId = await loadModel({
  modelSrc: "https:  modelType: "llamacpp-completion",
  onProgress: (progress) => {
    console.log(`Downloaded: ${progress.percentage}%`);
  }
});

const multimodalId = await loadModel({
  modelSrc: "https:  modelType: "llamacpp-completion",
  modelConfig: {
    ctx_size: 512,
    projectionModelSrc: "https:  },
  onProgress: (progress) => {
    console.log(`Loading: ${progress.percentage}%`);
  }
});

const whisperId = await loadModel({
  modelSrc: "https:  modelType: "whispercpp-transcription",
  modelConfig: {
    mode: "caption",
    output_format: "plaintext",
    min_seconds: 2,
    max_seconds: 6,
    vadModelSrc: "https:  }
});

import { getLogger } from "@const logger = getLogger("my-app");

const modelId = await loadModel({
  modelSrc: "  modelType: "llamacpp-completion",
  logger });

import { LLAMA_3_2_1B_INST_Q4_0 } from "@qvacconst resilientId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  fallbackSrc: "https:});
```

#### Overload 3 — Custom plugin

Loads a custom plugin model (any non-built-in `modelType` string).
`modelConfig` is plugin-defined; the SDK does not narrow it.

**Signature**:

```ts
function loadModel(options: LoadCustomPluginModelOptions<T>, rpcOptions?: RPCOptions): Promise<string> & { requestId: string };
```

**Throws**:

* `ModelTypeRequiredError` — When `modelType` cannot be inferred from `modelSrc` at runtime.

#### Overload 4 — Hot-reload config

Hot-reloads configuration on an already loaded model.

**Signature**:

```ts
function loadModel(options: ReloadConfigOptions, rpcOptions?: RPCOptions): Promise<string> & { requestId: string };
```

**Throws**:

* `QvacErrorBase` — When model reload fails, with details in the error message
* `QvacErrorBase` — When receiving an invalid response type from the server

**Example**:

```ts
const modelId = await loadModel({
  modelSrc: "pear:  modelType: "whisper",
  modelConfig: { language: "en" },
});

await loadModel({
  modelId,
  modelType: "whisper",
  modelConfig: { language: "es" },
});
```

***

### `loadVectorIndex`

Loads a vector index snapshot written by `VectorIndex.write()` into worker
memory and returns a handle to it.

The snapshot records its dimension, storage mode, and entries, so nothing
else needs to be supplied. Loading copies the file into memory; later
changes are not written back until `write()` is called again.

**Signature**:

```ts
function loadVectorIndex(params: LoadVectorIndexParams, options?: RPCOptions): Promise<VectorIndex>;
```

**Throws**:

* `VectorIndexProviderUnavailableError` — When no registered plugin exposes a vector index provider
* `VectorIndexFailedError` — When the file is missing, corrupt, or not a vector index snapshot

**Example**:

```ts
const index = await loadVectorIndex({ path: 'indexesconst hits = await index.search({ query, k: 5 })
await index.dispose()
```

***

### `loggingStream`

Opens a logging stream to receive real-time logs.

**Signature**:

```ts
function loggingStream(params: LoggingParams): AsyncGenerator<LoggingStreamResponse>;
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid or when the stream fails

**Example**:

```ts
const logStream = loggingStream({ id: 'my-model-id' });

const sdkLogs = loggingStream({ id: SDK_LOG_ID });

for await (const logMessage of logStream) {
  console.log(`[${logMessage.level}] ${logMessage.namespace}: ${logMessage.message}`);
}
```

***

### `modelRegistryGetModel`

Fetches a single model entry from the registry by its path and source.

**Signature**:

```ts
function modelRegistryGetModel(registryPath: string, registrySource: string): Promise<ModelRegistryEntry>;
```

**Throws**:

* `ModelRegistryQueryFailedError` — When the model cannot be located or the registry query fails.

***

### `modelRegistryList`

Returns all available models from the QVAC distributed model registry.

**Signature**:

```ts
function modelRegistryList(): Promise<ModelRegistryEntry[]>;
```

**Throws**:

* `ModelRegistryQueryFailedError` — When the registry query fails.

***

### `modelRegistrySearch`

Searches the model registry with optional filters for model type, engine, and quantization.

**Signature**:

```ts
function modelRegistrySearch(params: ModelRegistrySearchParams): Promise<ModelRegistryEntry[]>;
```

**Throws**:

* `ModelRegistryQueryFailedError` — When the registry query fails.

***

### `ocr`

Performs Optical Character Recognition (OCR) on an image to extract text.

**Signature**:

```ts
function ocr(params: OCRClientParams): { blocks: Promise<OCRTextBlock[]>; blockStream: AsyncGenerator<OCRTextBlock[]>; stats: Promise<any> };
```

**Example**:

```ts
const modelId = await loadModel({
  modelSrc: OCR_LATIN.src,
  modelType: MODEL_TYPES.ggmlOcr,
});

const { blocks } = ocr({ modelId, image: "for (const block of await blocks) {
  console.log(block.text, block.bbox, block.confidence);
}

const { blockStream } = ocr({ modelId, image: imageBuffer, stream: true });
for await (const blocks of blockStream) {
  console.log("Detected:", blocks);
}
```

***

### `ragChunk`

Chunks documents into smaller pieces for embedding.
Part of the segregated flow: ragChunk() → embed() → ragSaveEmbeddings()

**Signature**:

```ts
function ragChunk(params: RagChunkParams, options?: RPCOptions): Promise<RagDoc[]>;
```

**Throws**:

* `RAGChunkFailedError` — When the operation fails

**Example**:

```ts
const chunks = await ragChunk({
  documents: ["Long document text here..."],
  chunkOpts: {
    chunkSize: 256,
    chunkOverlap: 50,
    chunkStrategy: "paragraph",
  },
});
```

***

### `ragCloseWorkspace`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Closes a RAG workspace, releasing in-memory resources (Corestore, HyperDB adapter, RAG instance).

**Workspace lifecycle:** Workspaces are implicitly opened.
This function explicitly closes them, releasing memory and file locks. The workspace data
remains on disk unless `deleteOnClose` is set to true.

**Signature**:

```ts
function ragCloseWorkspace(params?: RagCloseWorkspaceParams, options?: RPCOptions): Promise<void>;
```

**Throws**:

* `RAGCloseWorkspaceFailedError` — When the operation fails

**Example**:

```ts
await ragCloseWorkspace({ workspace: "my-docs" });

await ragCloseWorkspace({ workspace: "my-docs", deleteOnClose: true });
```

***

### `ragDeleteEmbeddings`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Deletes document embeddings from the RAG vector database.

**Workspace lifecycle:** This operation requires an existing workspace.

**Signature**:

```ts
function ragDeleteEmbeddings(params: RagDeleteEmbeddingsParams, options?: RPCOptions): Promise<void>;
```

**Throws**:

* `RAGDeleteFailedError` — When the operation fails or workspace doesn't exist

**Example**:

```ts
await ragDeleteEmbeddings({
  ids: ["doc-1", "doc-2"],
  workspace: "my-docs",
});
```

***

### `ragDeleteWorkspace`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Deletes a RAG workspace and all its data.
The workspace must not be currently loaded
**Signature**:

```ts
function ragDeleteWorkspace(params: RagDeleteWorkspaceParams, options?: RPCOptions): Promise<void>;
```

**Throws**:

* `RAGDeleteFailedError` — When the workspace doesn't exist or is currently loaded

**Example**:

```ts
await ragDeleteWorkspace({ workspace: "my-docs" });
```

***

### `ragIngest`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Ingests documents into the RAG vector database.
Full pipeline: chunk → embed → save

**Workspace lifecycle:** This operation implicitly opens (or creates) the workspace.
The workspace remains open until closed.

**Signature**:

```ts
function ragIngest(params: RagIngestParams, options?: RPCOptions): Promise<{ droppedIndices: number[]; processed: RagSaveEmbeddingsResult[] }> & { requestId: string };
```

**Throws**:

* `RAGSaveFailedError` — When the operation fails
* `StreamEndedError` — When streaming ends unexpectedly (only when using onProgress)

**Example**:

```ts
const result = await ragIngest({
  modelId,
  documents: ["Document 1", "Document 2"],
});

const result = await ragIngest({
  modelId,
  documents: ["Document 1", "Document 2"],
  workspace: "my-docs",
  onProgress: (stage, current, total) => {
    console.log(`[${stage}] ${current}  },
});
```

***

### `ragListWorkspaces`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Lists all RAG workspaces with their open status.

Returns all workspaces that exist on disk. The `open` field indicates whether
the workspace is currently loaded in memory and holding active resources
(Corestore, HyperDB adapter, and possibly a RAG instance).

**Signature**:

```ts
function ragListWorkspaces(options?: RPCOptions): Promise<RagWorkspaceInfo[]>;
```

**Throws**:

* `RAGListWorkspacesFailedError` — When the operation fails

**Example**:

```ts
const workspaces = await ragListWorkspaces();
```

***

### `ragReindex`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Reindexes the RAG database to optimize search performance.
For HyperDB, this rebalances centroids using k-means clustering.

**Workspace lifecycle:** This operation requires an existing workspace.

**Note:** Reindex requires a minimum number of documents to perform clustering.
For HyperDB, this is 16 documents by default. If there are insufficient documents,
`reindexed` will be `false` with `details` explaining the reason.

**Signature**:

```ts
function ragReindex(params: RagReindexParams, options?: RPCOptions): Promise<RagReindexResult> & { requestId: string };
```

**Throws**:

* `RAGSaveFailedError` — When the operation fails or workspace doesn't exist
* `StreamEndedError` — When streaming ends unexpectedly (only when using onProgress)

**Example**:

```ts
const result = await ragReindex({
  workspace: "my-docs",
});

if (!result.reindexed) {
  console.log("Reindex skipped:", result.details?.reason);
}

const result = await ragReindex({
  workspace: "my-docs",
  onProgress: (stage, current, total) => {
    console.log(`[${stage}] ${current}  },
});
```

***

### `ragSaveEmbeddings`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Saves pre-embedded documents to the RAG vector database.
Part of the segregated flow: chunk() → embed() → saveEmbeddings()

**Workspace lifecycle:** This operation implicitly opens (or creates) the workspace.
The workspace remains open until closed.

**Signature**:

```ts
function ragSaveEmbeddings(params: RagSaveEmbeddingsParams, options?: RPCOptions): Promise<RagSaveEmbeddingsResult[]> & { requestId: string };
```

**Throws**:

* `RAGSaveFailedError` — When the operation fails
* `StreamEndedError` — When streaming ends unexpectedly (only when using onProgress)

**Example**:

```ts
const chunks = await ragChunk({ documents: ["text1", "text2"] });
const { embedding: embeddings } = await embed({ modelId, text: chunks.map(c => c.content) });
const embeddedDocs = chunks.map((chunk, i) => ({
  ...chunk,
  embedding: embeddings[i],
  embeddingModelId: modelId,
}));
const result = await ragSaveEmbeddings({
  documents: embeddedDocs,
  workspace: "my-workspace",
});
```

***

### `ragSearch`

> 🧪 **Prototype only**: The built-in RAG vector store is not production grade. For production, use an external vector DB (see the RAG guide).

Searches for similar documents in the RAG vector database.

**Workspace lifecycle:** This operation requires an existing workspace. If the workspace
doesn't exist, returns an empty array.

**Signature**:

```ts
function ragSearch(params: RagSearchParams, options?: RPCOptions): Promise<RagSearchResult[]>;
```

**Throws**:

* `RAGSearchFailedError` — When the operation fails

**Example**:

```ts
const results = await ragSearch({
  modelId,
  query: "AI and machine learning",
  topK: 5,
  workspace: "my-docs",
});
```

***

### `resume`

Resumes the SDK runtime: restores all suspended Hyperswarm and Corestore
resources and releases the lifecycle gate so all SDK operations are allowed
again.

Safe to call from any lifecycle state — `resume()` is never blocked by the
lifecycle gate (along with `suspend()` and `state()`). Idempotent. Also
serves as the recovery path after a partial suspend failure.

After `resume()` resolves successfully, runtime state is `"active"` and
non-lifecycle SDK operations are accepted normally.

Behavior of in-flight operations from before the previous `suspend()`:

* P2P   swarm
**Signature**:

```ts
function resume(): Promise<void>;
```

**Throws**:

* `RPCError` — When one or more resources fail to resume. On partial
  failure the runtime stays `"suspended"` (operations remain blocked) so
  callers can retry `resume()`.

**Example**:

```ts
await resume();
console.log(await state()); ```

***

### `startRpcServer`

Start a worker-owned native RPC server. Non-loopback binding and advertising require explicit opt-in.
Cancel a pending start with its promise.requestId.

**Signature**:

```ts
function startRpcServer(options: StartRpcServerOptions): Promise<RpcServerInfo> & { requestId: string };
```

***

### `state`

Returns the current runtime lifecycle state.

Safe to call from any lifecycle state — `state()` is never blocked by the
lifecycle gate (along with `suspend()` and `resume()`).

**Signature**:

```ts
function state(): Promise<LifecycleState>;
```

**Throws**:

* `InvalidResponseError` — When the response envelope does not match the request type.

**Example**:

```ts
const current = await state();
if (current !== "active") {
  await resume();
}
```

***

### `stopRpcServer`

Withdraw the announcement and await native stop. Bare stop has no deadline.

**Signature**:

```ts
function stopRpcServer(options: StopRpcServerOptions): Promise<void>;
```

***

### `subscribeServerLogs`

Subscribes to every server-side log through a single stream: SDK server logs,
per-model addon logs (llamacpp, whispercpp, …) for all loaded models, and RAG
logs — without having to open a loggingStream per id.

Each delivered log keeps its origin in `log.id`: `SDK_LOG_ID` for SDK server
logs, the model id for model logs, or the RAG workspace key. Use it to tell the
sources apart.

Internally this opens a loggingStream on the reserved `SDK_ALL_LOG_ID`
stream that the worker fans every log into.

**Signature**:

```ts
function subscribeServerLogs(handler: ServerLogHandler): () => void;
```

**Example**:

```ts
const unsubscribe = subscribeServerLogs((log) => {
  console.log(`[${log.level}] ${log.id} ${log.namespace}: ${log.message}`);
});
unsubscribe();
```

***

### `suspend`

Suspends the SDK runtime: pauses all registered Hyperswarm and Corestore
resources and engages the lifecycle gate so non-lifecycle operations are
blocked until `resume()` is called.

Safe to call from any lifecycle state — `suspend()` is never blocked by the
lifecycle gate (along with `resume()` and `state()`). Idempotent.

After `suspend()` resolves, runtime state is `"suspended"` and any non-
lifecycle SDK operation throws `LifecycleOperationBlockedError` until
`resume()` is called.

In-flight operations started before suspend:

* P2P * HTTP downloads: bypass suspend entirely (bytes keep flowing)
* Local native inference: runs to completion regardless

**Signature**:

```ts
function suspend(): Promise<void>;
```

**Throws**:

* `RPCError` — When one or more resources fail to suspend. The runtime
  still commits to `"suspended"` so callers can recover with `resume()`.

**Example**:

```ts
await suspend();
console.log(await state()); ```

***

### `textToSpeech`

Converts text to speech audio using a loaded TTS model.

Three modes selected by `params.stream` and `params.sentenceStream`:

* `stream: false` — collect all PCM samples and resolve once via
  `result.buffer` (`Promise<number[]>`). `bufferStream` is empty.
* `stream: true` (default) — yield PCM samples through `result.bufferStream`
  (`AsyncGenerator<number>`) as they arrive. `buffer` resolves to an empty
  array.
* `stream: true, sentenceStream: true` — also exposes `result.chunkUpdates`
  (`AsyncGenerator<TtsSentenceChunkUpdate>`) so callers can mux per-sentence
  metadata with the audio. Multiple consumers can iterate the response
  independently via the underlying `TtsMulticast`.

MOSS models stream natively rather than by sentence: under `stream: true`
the whole text is one synthesis whose audio arrives every
`streamChunkTokens` codec frames (in one piece when that is unset), so
`durationTokens` and a MOSS-TTSD dialogue's reference transcripts apply to
the text as a whole. `sentenceStream: true` still splits a single-speaker
text; a dialogue rejects it. `sentenceStreamLocale` and
`sentenceStreamMaxChunkScalars` configure that splitting, so a MOSS request
rejects them unless it sets `sentenceStream: true`.

`result.done` resolves to `true` when synthesis completes cleanly, `false`
if the consumer breaks out before the terminal frame, or rejects on a
pipeline error. Awaiting `done` is safe even when no stream is iterated.

`result.sampleRate` resolves from the first audio frame (so it can be awaited
before draining the audio); `result.stats` and `result.stopReason` resolve
from the terminal frame. All three resolve — with `undefined` when the run
produced none — rather than reject. In `stream: true` mode (the default) the
run starts lazily: nothing is sent until `bufferStream` is first iterated, so
`done`, `sampleRate`, `stats` and `stopReason` stay pending until then. In
`stream: false` and `sentenceStream: true` modes the run starts immediately.
Read `sampleRate` rather than assuming the engine default: `outputSampleRate`
and the LavaSR enhancer both change it.

**Signature**:

```ts
function textToSpeech(params: TtsClientParamsInput, options?: RPCOptions): TextToSpeechStreamResult;
```

**Throws**:

* `TextToSpeechStreamFailedError` — When `sentenceStream: true` is paired
  with `stream: false`, or when the underlying RPC stream errors.

***

### `textToSpeechStream`

Duplex session: write UTF-8 text fragments (e.g. LLM token deltas) via `write`. Each string or
Uint8Array should be a complete UTF-8 fragment. The worker forwards them to the TTS streaming handler
(optional sentence accumulation via request fields). Iterate the session for `TextToSpeechStreamResponse`
lines (PCM in `buffer`, optional `chunkIndex` 
**Signature**:

```ts
function textToSpeechStream(params: TextToSpeechStreamClientParams, options?: RPCOptions): Promise<TextToSpeechStreamSession>;
```

**Throws**:

* `TextToSpeechStreamFailedError` — When the session is iterated more
  than once, receives a server error, or is written after closing.

***

### `transcribe`

Has 2 overloads.

#### Overload 1

**Signature**:

```ts
function transcribe(params: any, options?: RPCOptions): TranscribeCall<TranscribeSegment[]>;
```

#### Overload 2

**Signature**:

```ts
function transcribe(params: TranscribeClientParams, options?: RPCOptions): TranscribeCall<string>;
```

***

### `transcribeStream`

> ⚠️ **Deprecated**: Pass audio via `transcribe()` instead. This overload will be
> removed in the next major version.

Streaming transcription with upfront audio: sends full audio, yields text
chunks as they arrive.

Has 5 overloads.

#### Overload 1 — Upfront audio (deprecated)

> ⚠️ **Deprecated**: Pass audio via `transcribe()` instead. This overload will be
> removed in the next major version.

Streaming transcription with upfront audio: sends full audio, yields text
chunks as they arrive.

**Signature**:

```ts
function transcribeStream(params: any, options?: RPCOptions): AsyncGenerator<TranscribeSegment>;
```

#### Overload 2 — Upfront audio (deprecated)

> ⚠️ **Deprecated**: Pass audio via `transcribe()` instead. This overload will be
> removed in the next major version.

Streaming transcription with upfront audio: sends full audio, yields text
chunks as they arrive.

**Signature**:

```ts
function transcribeStream(params: TranscribeClientParams, options?: RPCOptions): AsyncGenerator<string>;
```

#### Overload 3 — Bidirectional session

Opens a bidirectional streaming transcription session. Audio is streamed
in via `write()`, and transcription text is yielded as the model's VAD
detects complete speech segments.

The returned session is single-use. Attempting to iterate a second
time will throw a `TranscriptionFailedError`.

**Signature**:

```ts
function transcribeStream(params: any, options?: RPCOptions): Promise<TranscribeStreamConversationSession>;
```

#### Overload 4 — Upfront audio (deprecated)

> ⚠️ **Deprecated**: Pass audio via `transcribe()` instead. This overload will be
> removed in the next major version.

Streaming transcription with upfront audio: sends full audio, yields text
chunks as they arrive.

**Signature**:

```ts
function transcribeStream(params: any, options?: RPCOptions): Promise<TranscribeStreamMetadataSession>;
```

#### Overload 5 — Upfront audio (deprecated)

> ⚠️ **Deprecated**: Pass audio via `transcribe()` instead. This overload will be
> removed in the next major version.

Streaming transcription with upfront audio: sends full audio, yields text
chunks as they arrive.

**Signature**:

```ts
function transcribeStream(params: TranscribeStreamClientParams, options?: RPCOptions): Promise<TranscribeStreamSession>;
```

***

### `translate`

Translates text from one language to another using a specified translation model.
Supports both NMT (Neural Machine Translation) and LLM models.

**Signature**:

```ts
function translate(params: TranslateClientParams, options?: RPCOptions): { requestId: string; stats: Promise<any>; text: Promise<string>; tokenStream: AsyncGenerator<string>; translations: Promise<string[]> };
```

**Throws**:

* `QvacErrorBase` — When translation fails with an error message or when language detection fails

**Example**:

```ts
const result = translate({
  modelId: "modelId",
  text: "Hello world",
  from: "en",
  to: "es",
  modelType: "llm",
});

for await (const token of result.tokenStream) {
  console.log(token);
}

const response = translate({
  modelId: "modelId",
  text: "Hello world",
  from: "en",
  to: "es",
  modelType: "llm",
  stream: false,
});

console.log(await response.text);
```

***

### `unloadModel`

Unloads a previously loaded model from the server.

When the last model is unloaded (no more models remain), this function
automatically closes the RPC connection on Nodeprocess to exit naturally without requiring manual cleanup. On Bare the
connection is left open by default so long-lived workers survive a routine
unload; pass `autoClose: true` to opt in to closing.

**Signature**:

```ts
function unloadModel(params: UnloadModelParams): Promise<void>;
```

**Throws**:

* `QvacErrorBase` — When the response type is invalid or when the unload operation fails

***

### `upscale`

Runs standalone ESRGAN upscaling on an arbitrary PNG
The model must have been loaded with `modelType: "diffusion"` and
`modelConfig.mode: "upscale"` — calling `upscale()` against a model
loaded in default (`mode: "diffusion"`) mode throws
`ModelOperationNotSupportedError` upfront.

`outputs` always resolves to length 1: `repeats` runs N passes
internally and emits a single final image at `source * scale^repeats`
dimensions. The `Uint8Array[]` shape reserves headroom for future
multi-output variants.

**Signature**:

```ts
function upscale(params: UpscaleClientParams): UpscaleResult;
```

**Throws**:

* `ModelOperationNotSupportedError` — If the model was not loaded
  with `mode: "upscale"`.
* `StreamEndedError` — If the RPC stream closes without emitting a
  terminal `done` chunk.

**Example**:

```ts
const modelId = await loadModel(REALESRGAN_X4PLUS_ANIME_6B, {
  modelType: "diffusion",
  modelConfig: { mode: "upscale", upscaler: { tile_size: 128 } },
});
const pngBytes = fs.readFileSync("input.png");
const { outputs, stats } = upscale({ modelId, image: pngBytes, repeats: 2 });
const [upscaledPng] = await outputs;
fs.writeFileSync("upscaled.png", upscaledPng);
console.log(await stats);
```

***

### `video`

Generates a video using a loaded video diffusion model.

**Signature**:

```ts
function video(params: VideoClientParams): VideoResult;
```

**Examples**:

```ts
const { outputs, stats } = video({
  modelId,
  mode: "txt2vid",
  prompt: "a cat surfing a wave at sunset",
  width: 480,
  height: 832,
  video_frames: 17,   fps: 16,
});
const buffers = await outputs;
fs.writeFileSync("output.avi", buffers[0]);
```

```ts
const { progressStream, outputs } = video({
  modelId,
  mode: "txt2vid",
  prompt: "a sunset over the ocean",
});
for await (const { step, totalSteps } of progressStream) {
  console.log(`${step}}
const buffers = await outputs;
```

```ts
const firstFrame = fs.readFileSync("portrait.png");
const { outputs } = video({
  modelId,
  mode: "img2vid",
  prompt: "the subject slowly turns and smiles, cinematic lighting",
  init_image: firstFrame,
  strength: 0.85,
});
```

```ts
const firstFrame = fs.readFileSync("first-frame.png");
const { outputs } = video({
  modelId,
  mode: "img2vid",
  prompt: "A sailboat glides across a calm bay as the camera follows it.",
  init_image: firstFrame,
  width: 864,
  height: 480,
  video_frames: 22,
  fps: 24,
  cfg_scale: 1,
});
fs.writeFileSync("h3-output.avi", (await outputs)[0]);
```

```ts
const frameA = fs.readFileSync("frame-a.png");
const frameB = fs.readFileSync("frame-b.png");
const { outputs } = video({
  modelId,
  mode: "txt2vid",
  prompt: "smooth transition between scenes",
  control_frames: [frameA, frameB],
});
```

```ts
const referenceSheet = fs.readFileSync("reference-sheet.png");
const { outputs } = video({
  modelId,
  mode: "txt2vid",
  prompt: "Reference sheet: a red-haired explorer. Generated video: the explorer crosses a snowy ridge.",
  lora: "  lora_strength: 1.37,
  stg_scale: 1,
  stg_block: 29,
  reference_images: [referenceSheet],
  reference_attention_strength: 1,
  reference_downscale_factor: 1,
  video_frames: 217,
  scheduler: "ltx2",
});
const buffers = await outputs;
```

```ts
const { requestId, outputs } = video({ modelId, mode: "txt2vid", prompt: "..." });
await cancel(requestId);
```

***

### `vla`

Run VLA inference on a loaded model (SmolVLA, π₀.₅, or GR00T) and return the
produced action chunk plus per-stage timings.

**Signature**:

```ts
function vla(params: VlaClientRunParams): Promise<VlaClientRunResult>;
```

**Example**:

```ts
import { loadModel, vla, vlaPreprocessImage, vlaPadState, vlaHparams } from "@qvac
const modelId = await loadModel({ modelSrc: "const { hparams } = await vlaHparams({ modelId });
const size = hparams.visionImageSize;
const front = vlaPreprocessImage(frontPixels, frontW, frontH, { size });
const wrist = vlaPreprocessImage(wristPixels, wristW, wristH, { size });
const state = vlaPadState(robotState, hparams.maxStateDim);
const tokens = new Int32Array(hparams.tokenizerMaxLength);
const mask = new Uint8Array(hparams.tokenizerMaxLength);
const { actions } = await vla({
  modelId, images: [front, wrist], imgWidth: size, imgHeight: size,
  state, tokens, mask,
});
```

***

### `vlaHparams`

Fetch the loaded VLA model's hyperparameters and the active ggml backend
name. Useful to size token 
**Signature**:

```ts
function vlaHparams(params: { modelId: string }): Promise<{ hparams: VlaHparams; backendName: string | null }>;
```

***

### `vlaPadState`

Zero-pad a state vector to `targetDim`. Extra entries are zero-initialised;
input longer than `targetDim` raises. Mirrors how smolvla.cpp expects the
state tensor (`max_state_dim` = 32 by default).

**Signature**:

```ts
function vlaPadState(state: ArrayLike<number>, targetDim: number): Float32Array;
```

**Throws**:

* `TypeError` — When `targetDim` is not a positive integer.
* `RangeError` — When `state` is longer than `targetDim`.

***

### `vlaPreprocessImage`

Resize + letterbox + normalize a camera frame to `(3, size, size)` Float32
in `[-1, 1]`. Drop-in equivalent of `@qvac
Letterbox places the resized content at the **bottom-right** with padding
at topthe reference smolvla.cpp behavior.

**Signature**:

```ts
function vlaPreprocessImage(pixels: PixelsInput, width: number, height: number, opts: VlaPreprocessImageOptions): Float32Array;
```

**Throws**:

* `TypeError` — When width or height is not a positive integer.
* `RangeError` — When the pixel count does not match the dimensions.

***

### `vlaSetEmbodiment`

Switch a loaded multi-embodiment GR00T model to another embodiment shipped
in the same GGUF — no reload, only that embodiment's weight rows are re-read.

The returned hparams follow the newly active embodiment: re-read
`numCameras` (and re-size buffers if needed) before the next `vla()` call.
`selectedEmbodimentTag` resolved. Selecting by `catId` reports that id's canonical tag, which may
differ from the alias used to select — the id is the stable identity.

Rejects (leaving the current embodiment active) for a non-GR00T or
single-embodiment model, an unknown tag or `cat_id`, one not stored in the
GGUF, an embodiment with no known camera count and no `numCameras`
override, or while an inference response is still pending — await the
in-flight `vla()` call first.

**Signature**:

```ts
function vlaSetEmbodiment(params: { embodiment: VlaEmbodimentSelection; modelId: string }): Promise<{ hparams: VlaHparams }>;
```

**Example**:

```ts
import { loadModel, vlaSetEmbodiment, vlaHparams } from "@qvac
const modelId = await loadModel({
  modelSrc: "  modelType: "vla",
  modelConfig: { embodiment: "libero_sim" }, });
const { hparams } = await vlaSetEmbodiment({ modelId, embodiment: "real_droid" });
console.log(hparams.selectedEmbodimentTag, hparams.numCameras);
```

***

### `worldCreateScene`

Has 3 overloads.

#### Overload 1

Builds a world for an ABot-World session: the prompt and first frame are
encoded into a scene pack the walk then runs on.

Run this once per world. The world is live on the session as soon as this
completes — `stats` is the completion signal. Creating a world on a session
that already has one replaces it and restarts the walk from the beginning.

The pack itself is NOT returned by default: it is 10+ MB, a third larger again
as base64, and the common create-then-walk-now flow never touches the bytes.
Pass `returnPack: true` to get them, save them, and pass that file back as
`modelConfig.sceneSrc` on a later `loadModel` to walk the same world again.
`sceneSrc` takes a path or URL, so persist the bytes yourself.

Scene creation cannot be interrupted — the engine exposes no abort hook for
it — so cancelling by request id stops the SDK from yielding but the encode
runs to completion. Await the result before unloading the model.

**Signature**:

```ts
function worldCreateScene(params: any): WorldSceneResultWithPack;
```

**Throws**:

* `RequestValidationFailedError` — Client-side, before any RPC, if the
  prompt is empty, the dimensions are not positive multiples of 32 within the
  per-axis and total-pixel ceilings, or the first frame exceeds 3 MB.
  Server-side, before the session is touched, if the first frame's header
  declares more than 8192x8192 pixels or cannot be read. Raised as
  `PluginRequestValidationFailedError` on the engine; that class is not
  exported from the client package and is not in the RPC reconstructor map, so
  match it on message rather than with `instanceof`.
* `ModelOperationNotSupportedError` — If the model was not loaded with
  `mode: "world"`.
* `RequestRejectedByPolicyError` — If a world job is already running on
  this model — world refuses rather than queues.
* `InferenceCancelledError` — If cancel by request id is accepted.
  Scene creation is uninterruptible, so this stops delivery while the encode
  runs to completion.
* `StreamEndedError` — If the RPC stream closes without a terminal
  `done` chunk.

**Example**:

```ts
const modelId = await loadModel({
  modelType: "diffusion",
  modelSrc: ABOT_WORLD_0_5B_Q8_0,
  modelConfig: {
    mode: "world",
    taehvModelSrc: ABOT_WORLD_0_5B_LF_TAEHV_VAE,
    t5XxlModelSrc: UMT5_XXL_ENC_Q8_0,
    vaeModelSrc: ABOT_WORLD_0_5B_LF_WAN_VAE,
    world: { seed: 42, kvCache: true },
  },
});

const { stats } = worldCreateScene({
  modelId,
  prompt: "| unknown | A realistic outdoor world scene with a navigable path.",
  image: fs.readFileSync("first-frame.jpg"),
});
await stats;

const { scene } = worldCreateScene({
  modelId,
  prompt: "| unknown | A realistic outdoor world scene with a navigable path.",
  image: fs.readFileSync("first-frame.jpg"),
  returnPack: true,
});
fs.writeFileSync("world.safetensors", await scene);
```

#### Overload 2

Builds a world for an ABot-World session: the prompt and first frame are
encoded into a scene pack the walk then runs on.

Run this once per world. The world is live on the session as soon as this
completes — `stats` is the completion signal. Creating a world on a session
that already has one replaces it and restarts the walk from the beginning.

The pack itself is NOT returned by default: it is 10+ MB, a third larger again
as base64, and the common create-then-walk-now flow never touches the bytes.
Pass `returnPack: true` to get them, save them, and pass that file back as
`modelConfig.sceneSrc` on a later `loadModel` to walk the same world again.
`sceneSrc` takes a path or URL, so persist the bytes yourself.

Scene creation cannot be interrupted — the engine exposes no abort hook for
it — so cancelling by request id stops the SDK from yielding but the encode
runs to completion. Await the result before unloading the model.

**Signature**:

```ts
function worldCreateScene(params: any): WorldSceneResult;
```

**Throws**:

* `RequestValidationFailedError` — Client-side, before any RPC, if the
  prompt is empty, the dimensions are not positive multiples of 32 within the
  per-axis and total-pixel ceilings, or the first frame exceeds 3 MB.
  Server-side, before the session is touched, if the first frame's header
  declares more than 8192x8192 pixels or cannot be read. Raised as
  `PluginRequestValidationFailedError` on the engine; that class is not
  exported from the client package and is not in the RPC reconstructor map, so
  match it on message rather than with `instanceof`.
* `ModelOperationNotSupportedError` — If the model was not loaded with
  `mode: "world"`.
* `RequestRejectedByPolicyError` — If a world job is already running on
  this model — world refuses rather than queues.
* `InferenceCancelledError` — If cancel by request id is accepted.
  Scene creation is uninterruptible, so this stops delivery while the encode
  runs to completion.
* `StreamEndedError` — If the RPC stream closes without a terminal
  `done` chunk.

**Example**:

```ts
const modelId = await loadModel({
  modelType: "diffusion",
  modelSrc: ABOT_WORLD_0_5B_Q8_0,
  modelConfig: {
    mode: "world",
    taehvModelSrc: ABOT_WORLD_0_5B_LF_TAEHV_VAE,
    t5XxlModelSrc: UMT5_XXL_ENC_Q8_0,
    vaeModelSrc: ABOT_WORLD_0_5B_LF_WAN_VAE,
    world: { seed: 42, kvCache: true },
  },
});

const { stats } = worldCreateScene({
  modelId,
  prompt: "| unknown | A realistic outdoor world scene with a navigable path.",
  image: fs.readFileSync("first-frame.jpg"),
});
await stats;

const { scene } = worldCreateScene({
  modelId,
  prompt: "| unknown | A realistic outdoor world scene with a navigable path.",
  image: fs.readFileSync("first-frame.jpg"),
  returnPack: true,
});
fs.writeFileSync("world.safetensors", await scene);
```

#### Overload 3

Builds a world for an ABot-World session: the prompt and first frame are
encoded into a scene pack the walk then runs on.

Run this once per world. The world is live on the session as soon as this
completes — `stats` is the completion signal. Creating a world on a session
that already has one replaces it and restarts the walk from the beginning.

The pack itself is NOT returned by default: it is 10+ MB, a third larger again
as base64, and the common create-then-walk-now flow never touches the bytes.
Pass `returnPack: true` to get them, save them, and pass that file back as
`modelConfig.sceneSrc` on a later `loadModel` to walk the same world again.
`sceneSrc` takes a path or URL, so persist the bytes yourself.

Scene creation cannot be interrupted — the engine exposes no abort hook for
it — so cancelling by request id stops the SDK from yielding but the encode
runs to completion. Await the result before unloading the model.

**Signature**:

```ts
function worldCreateScene(params: WorldSceneClientParams): WorldSceneResultWithPack | WorldSceneResult;
```

**Throws**:

* `RequestValidationFailedError` — Client-side, before any RPC, if the
  prompt is empty, the dimensions are not positive multiples of 32 within the
  per-axis and total-pixel ceilings, or the first frame exceeds 3 MB.
  Server-side, before the session is touched, if the first frame's header
  declares more than 8192x8192 pixels or cannot be read. Raised as
  `PluginRequestValidationFailedError` on the engine; that class is not
  exported from the client package and is not in the RPC reconstructor map, so
  match it on message rather than with `instanceof`.
* `ModelOperationNotSupportedError` — If the model was not loaded with
  `mode: "world"`.
* `RequestRejectedByPolicyError` — If a world job is already running on
  this model — world refuses rather than queues.
* `InferenceCancelledError` — If cancel by request id is accepted.
  Scene creation is uninterruptible, so this stops delivery while the encode
  runs to completion.
* `StreamEndedError` — If the RPC stream closes without a terminal
  `done` chunk.

**Example**:

```ts
const modelId = await loadModel({
  modelType: "diffusion",
  modelSrc: ABOT_WORLD_0_5B_Q8_0,
  modelConfig: {
    mode: "world",
    taehvModelSrc: ABOT_WORLD_0_5B_LF_TAEHV_VAE,
    t5XxlModelSrc: UMT5_XXL_ENC_Q8_0,
    vaeModelSrc: ABOT_WORLD_0_5B_LF_WAN_VAE,
    world: { seed: 42, kvCache: true },
  },
});

const { stats } = worldCreateScene({
  modelId,
  prompt: "| unknown | A realistic outdoor world scene with a navigable path.",
  image: fs.readFileSync("first-frame.jpg"),
});
await stats;

const { scene } = worldCreateScene({
  modelId,
  prompt: "| unknown | A realistic outdoor world scene with a navigable path.",
  image: fs.readFileSync("first-frame.jpg"),
  returnPack: true,
});
fs.writeFileSync("world.safetensors", await scene);
```

***

### `worldStep`

Generates the next block of an ABot-World walk under the keys held for it.

One call produces one block: at the default `world.numFramePerBlock`, 9 frames
for the first block after the session loads (decoder warmup) and 12
thereafter. Both counts move with `numFramePerBlock`, so read `stats.frames`
rather than assuming them. Frames arrive on `frameStream` as they are decoded,
so a viewer can display them without waiting for the block.

Only one block runs at a time per model — a second call while one is in
flight is rejected rather than queued, so drive the next call off the
previous one. Cancelling has block granularity: the current block finishes
internally, delivery stops, and the call rejects rather than returning a
truncated block.

`keys` accepts an array, a key-state object, or a raw 8-bit mask. WASD move,
IJKL steer the camera; omit for an idle block.

`progressStream` forwards the engine's step the same shape `video` and `diffusion` emit. The engine fires it once per
block, AFTER the frames, so it is an end-of-block summary rather than
mid-block liveness — one tick per `worldStep` call.

**Signature**:

```ts
function worldStep(params: WorldStepClientParams): WorldStepResult;
```

**Throws**:

* `RequestValidationFailedError` — Client-side, before any RPC, on an
  unknown walk key.
* `ModelOperationNotSupportedError` — If the model was not loaded with
  `mode: "world"`.
* `RequestRejectedByPolicyError` — If a block is already in flight on
  this model.
* `InferenceCancelledError` — If cancel by request id is accepted. The
  step rejects rather than resolving with a truncated block, and the session
  is rebuilt on the next call.
* `StreamEndedError` — If the RPC stream closes without a terminal
  `done` chunk.

**Examples**:

```ts
const { frameStream } = worldStep({ modelId, keys: ["W"] });
for await (const frame of frameStream) {
  display(frame); }
```

```ts
const { progressStream, frames } = worldStep({ modelId, keys: ["W"] });
for await (const { totalSteps, elapsedMs } of progressStream) {
    report(`block delivered ${totalSteps} frames in ${elapsedMs}ms`);
}
for (const frame of await frames) display(frame);
```

```ts
while (walking) {
  const { frames } = worldStep({ modelId, keys: heldKeys });   for (const frame of await frames) display(frame);
}
```

***

## Objects

### `profiler`

QVAC Profiler

**Shape**:

```ts
const profiler: {
  clear(): void;
  disable(): void;
  enable(options?: ProfilerRuntimeOptions): void;
  exportJSON(options?: { includeRecentEvents?: boolean }): ProfilerExport;
  exportSummary(): string;
  exportTable(): string;
  getAggregates(): Record<string, AggregatedStats>;
  getConfig(): ResolvedProfilerConfig;
  isEnabled(): boolean;
  onRecord(callback: (event: ProfilingEvent) => void): () => void;
};
```

**Methods**:

* **`clear()`** — Clears all aggregated data and the recent-events ring buffer.
* **`disable()`** — Disables profiling.
* **`enable(options?)`** — Enables profiling and resets all previously aggregated data.
* **`exportJSON(options?)`** — Exports profiling data as a structured JSON object suitable for machine consumption.
* **`exportSummary()`** — Exports a short, human-readable summary string of the aggregated stats.
* **`exportTable()`** — Exports aggregated stats as a formatted ASCII table suitable for terminal output.
* **`getAggregates()`** — Returns all aggregated stats keyed by operation name.
* **`getConfig()`** — Returns the current effective profiler configuration.
* **`isEnabled()`** — Returns whether profiling is currently enabled.
* **`onRecord(callback)`** — Registers a listener for profiling events; returns an unsubscribe function.

**Example**:

```ts
import { profiler } from "@qvac
profiler.enable({ mode: "summary" });
console.log(profiler.exportTable());
profiler.disable();
```

***

## Errors

Public error codes thrown across the SDK. Catch via `instanceof QvacErrorBase`
and read `error.code` 50,001–52,000 (client) and 52,001–54,000 (server).

### Client errors

| Error                             | Code  | Summary                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_RESPONSE_TYPE`           | 50001 | Invalid response type received, expected: …                                                                                                                                                                                                                                                                                                                                       |
| `INVALID_OPERATION_IN_RESPONSE`   | 50002 | Invalid operation type in response                                                                                                                                                                                                                                                                                                                                                |
| `STREAM_ENDED_WITHOUT_RESPONSE`   | 50003 | Stream ended without receiving final response                                                                                                                                                                                                                                                                                                                                     |
| `INVALID_AUDIO_CHUNK_TYPE`        | 50004 | Invalid audio chunk type received                                                                                                                                                                                                                                                                                                                                                 |
| `INVALID_TOOLS_ARRAY`             | 50005 | Invalid tools array provided                                                                                                                                                                                                                                                                                                                                                      |
| `INVALID_TOOL_SCHEMA`             | 50006 | Invalid tool schema: …                                                                                                                                                                                                                                                                                                                                                            |
| `OCR_FAILED`                      | 50007 | OCR operation failed…                                                                                                                                                                                                                                                                                                                                                             |
| `MODEL_TYPE_REQUIRED`             | 50008 | modelType is required: modelSrc is a plain string or lacks an engine| `MODEL_SRC_TYPE_MISMATCH`         | 50009 | modelSrc describes "…", but modelType resolves to "…". Omit modelType to infer it automatically, or pass a matching modelType.                                                                                                                                                                                                                                                    |
| `REQUEST_VALIDATION_FAILED`       | 50010 | Invalid request:\n…                                                                                                                                                                                                                                                                                                                                                               |
| `RPC_NO_HANDLER`                  | 50200 | No handler function registered for request type: …                                                                                                                                                                                                                                                                                                                                |
| `RPC_REQUEST_NOT_SENT`            | 50201 | Cannot perform operation - request has not been sent yet                                                                                                                                                                                                                                                                                                                          |
| `RPC_RESPONSE_STREAM_NOT_CREATED` | 50202 | Cannot perform operation - response stream not created                                                                                                                                                                                                                                                                                                                            |
| `RPC_CONNECTION_FAILED`           | 50203 | RPC connection failed: …                                                                                                                                                                                                                                                                                                                                                          |
| `RPC_INIT_TIMEOUT`                | 50204 | RPC initialization timed out after …ms — the worker process may have failed to start                                                                                                                                                                                                                                                                                              |
| `WORKER_CRASHED`                  | 50205 | Bare worker exited mid-request (code=…, signal=…) — in-flight calls were aborted                                                                                                                                                                                                                                                                                                  |
| `WORKER_SHUTDOWN`                 | 50206 | SDK is shutting down — in-flight RPC call aborted                                                                                                                                                                                                                                                                                                                                 |
| `WORKER_STARTUP_FAILED`           | 50207 | …\n\nWorker stderr:\n…                                                                                                                                                                                                                                                                                                                                                            |
| `SDK_NOT_FOUND_IN_NODE_MODULES`   | 50600 | QVAC SDK not found in node\_modules. Checked: @qvac| `WORKER_FILE_NOT_FOUND`           | 50601 | Worker file not found at …                                                                                                                                                                                                                                                                                                                                                        |
| `CONFIG_FILE_NOT_FOUND`           | 50602 | Config file not found. Searched: …. Create qvac.config.json, qvac.config.js, or qvac.config.ts in your project root.                                                                                                                                                                                                                                                              |
| `CONFIG_FILE_INVALID`             | 50603 | Config file at … is invalid: …                                                                                                                                                                                                                                                                                                                                                    |
| `CONFIG_FILE_PARSE_FAILED`        | 50604 | Failed to parse config file at …: …                                                                                                                                                                                                                                                                                                                                               |
| `CONFIG_VALIDATION_FAILED`        | 50605 | Config validation failed: …                                                                                                                                                                                                                                                                                                                                                       |
| `PEAR_WORKER_ENTRY_REQUIRED`      | 50606 | No plugins registered. Pear apps must spawn … as the worker entry. Run \\                                                                                                                                                                                                                                                                                                         |
| `MULTIPLE_SDK_INSTALLATIONS`      | 50607 | Multiple QVAC SDK installations found: …. Remove all but one to avoid conflicts.                                                                                                                                                                                                                                                                                                  |
| `WORKER_PLUGINS_NOT_REGISTERED`   | 50608 | @qvac| `BUNDLE_VERIFICATION_FAILED`      | 50609 | qvac verify bundle reported error-level issues for …. See the CLI output above for the failing addons| `BARE_PACK_NOT_INSTALLED`         | 50610 | bare-pack binary not found. Install bare-pack as a peer dependency: npm install bare-pack                                                                                                                                                                                                                                                                                         |
| `BARE_PACK_ERROR`                 | 50611 | bare-pack exited with code …\n\n Entry file: …\n Output file: …\n\n Run bare-pack manually for more details.                                                                                                                                                                                                                                                                      |
| `INVALID_PLUGIN_SPECIFIER`        | 50612 | Invalid plugin specifiers (must end with | `BARE_IMPORTS_MAP_NOT_FOUND`      | 50613 | bare-imports.json not found.\n\n Expected at: …\n\n Make sure … is installed in your project.                                                                                                                                                                                                                                                                                     |
| `BARE_RUNTIME_BINARY_NOT_FOUND`   | 50614 | Could not load the Bare runtime binary for …-…. The platform package "bare-runtime-…-…" (or one of its dependencies) is missing from node\_modules — commonly seen with pnpm, which does not always install nested optional dependencies. Fix it by installing the platform package directly (e.g. \\                                                                             |
| `HOST_PREBUILDS_INSTALL_REFUSED`  | 50615 | Cannot install the addon platform packages automatically: ….                                                                                                                                                                                                                                                                                                                      |
| `HOST_PREBUILDS_INSTALL_FAILED`   | 50616 | Installing the addon platform packages failed: …                                                                                                                                                                                                                                                                                                                                  |
| `ADDON_LINK_FAILED`               | 50617 | Linking the native addons failed\n\n Hosts: …\n Reason: …                                                                                                                                                                                                                                                                                                                         |
| `BARE_PACK_NODE_UNSUPPORTED`      | 50618 | bare-pack needs Node …; found Node v…. Upgrade Node and run the bundle again.                                                                                                                                                                                                                                                                                                     |
| `HOST_PREBUILDS_MISSING`          | 50619 | #host-addon                                                                                                                                                                                                                                                                                                                                                                       |
| `PROFILER_INVALID_CAPACITY`       | 50800 | Profiler invalid capacity                                                                                                                                                                                                                                                                                                                                                         |

### Server errors

| Error                                  | Code  | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MODEL_ALREADY_REGISTERED`             | 52001 | Model with ID "…" is already registered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MODEL_NOT_FOUND`                      | 52002 | Model with ID "…" not found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `MODEL_NOT_LOADED`                     | 52003 | Model with ID "…" is not loaded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `UNKNOWN_MODEL_TYPE`                   | 52005 | Unknown model type: …. If using a custom worker bundle, ensure the plugin for "…" is included in your qvac.config plugins array and rebuild with "npx qvac bundle sdk".                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MODEL_LOAD_FAILED`                    | 52200 | Failed to load model…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `MODEL_FILE_NOT_FOUND`                 | 52201 | Model file not found: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MODEL_FILE_NOT_FOUND_IN_DIR`          | 52202 | … model file … not found in directory …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MODEL_FILE_LOCATE_FAILED`             | 52203 | Failed to locate … model file: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `PROJECTION_MODEL_REQUIRED`            | 52204 | Projection model source is required for multimodal LLM models                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `VAD_MODEL_REQUIRED`                   | 52205 | VAD model source is required for this configuration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `TTS_ARTIFACTS_REQUIRED`               | 52208 | TTS (Chatterbox) requires s3genModelSrc in modelConfig (companion S3Gen GGUF) and the primary T3 GGUF via modelSrc                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `TTS_REFERENCE_AUDIO_REQUIRED`         | 52209 | TTS (Chatterbox) requires referenceAudioSrc (path or URL to a WAV file for voice cloning)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `LEGACY_PARAKEET_MODEL_DEPRECATED`     | 52210 | Legacy parakeet ONNX modelConfig fields are no longer supported (…). As of @qvac| `LEGACY_TTS_MODEL_DEPRECATED`          | 52211 | Legacy ONNX TTS modelConfig fields are no longer supported (…). As of @qvac| `MODEL_FIT_REFUSED`                    | 52212 | …: the engine fitter projects this load will not fit (…)$\{ detail ?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `RPC_SERVER_OPERATION_FAILED`          | 52423 | …: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `MODEL_UNLOAD_FAILED`                  | 52400 | Failed to unload model…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `EMBED_FAILED`                         | 52401 | Failed to generate embeddings…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `EMBED_NO_EMBEDDINGS`                  | 52402 | No embeddings returned from model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `TRANSCRIPTION_FAILED`                 | 52403 | Transcription failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `AUDIO_FILE_NOT_FOUND`                 | 52404 | Audio file not found or not accessible: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `TRANSLATION_FAILED`                   | 52405 | Translation failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `COMPLETION_FAILED`                    | 52406 | Completion failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ATTACHMENT_NOT_FOUND`                 | 52407 | Attachment not found at path: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CANCEL_FAILED`                        | 52408 | Failed to cancel operation…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `TEXT_TO_SPEECH_FAILED`                | 52409 | Text-to-speech operation failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `CONFIG_RELOAD_NOT_SUPPORTED`          | 52410 | Model "…" does not support hot config reload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `MODEL_TYPE_MISMATCH`                  | 52411 | Model type mismatch: expected "…", got "…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `OCR_FAILED`                           | 52412 | OCR operation failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `IMAGE_FILE_NOT_FOUND`                 | 52413 | Image file not found or not accessible: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `INVALID_IMAGE_INPUT`                  | 52414 | Invalid image input type provided                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `TEXT_TO_SPEECH_STREAM_FAILED`         | 52415 | Text-to-speech stream operation failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MODEL_OPERATION_NOT_SUPPORTED`        | 52416 | Supported operations on this model: ….                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `REQUEST_ID_CONFLICT`                  | 52417 | Request id "…" is already in flight; refusing to overwrite the existing context                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `REQUEST_NOT_FOUND`                    | 52418 | No in-flight request with id "…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `INFERENCE_CANCELLED`                  | 52419 | Inference request "…" was cancelled before it could complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `REQUEST_REJECTED_BY_POLICY`           | 52420 | Request "…" (kind: …, modelId: …) was rejected by registry concurrency policy: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `CONTEXT_OVERFLOW`                     | 52421 | for model "…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `INVALID_AUDIO_INPUT`                  | 52422 | Invalid audio input…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `RAG_SAVE_FAILED`                      | 52800 | Failed to save embeddings…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `RAG_SEARCH_FAILED`                    | 52801 | Failed to search embeddings…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `RAG_DELETE_FAILED`                    | 52802 | Failed to delete embeddings…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `RAG_UNKNOWN_OPERATION`                | 52803 | Unknown RAG operation: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `RAG_HYPERDB_FAILED`                   | 52804 | HyperDB RAG operation failed: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `RAG_WORKSPACE_MODEL_MISMATCH`         | 52805 | Workspace "…" is configured for model "…", but you're trying to use model "…". Use a different workspace or the same model                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `RAG_WORKSPACE_NOT_FOUND`              | 52806 | RAG workspace not found: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `RAG_WORKSPACE_IN_USE`                 | 52807 | RAG workspace '…' is currently in use. Close it first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `RAG_WORKSPACE_CLOSE_FAILED`           | 52808 | Failed to close RAG workspace…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `RAG_LIST_WORKSPACES_FAILED`           | 52809 | Failed to list RAG workspaces…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `RAG_CHUNK_FAILED`                     | 52810 | Failed to chunk documents…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `RAG_WORKSPACE_NOT_OPEN`               | 52811 | RAG workspace '…' is not open                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `VECTOR_INDEX_PROVIDER_UNAVAILABLE`    | 52850 | Vector index provider unavailable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `VECTOR_INDEX_NOT_FOUND`               | 52851 | Vector index '…' is not open. It was disposed or the worker restarted; create a new index or load a snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `VECTOR_INDEX_INVALID_VECTORS`         | 52852 | Invalid vector input: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `VECTOR_INDEX_FAILED`                  | 52853 | Vector index operation failed: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `FILE_NOT_FOUND`                       | 53000 | File not found: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `DOWNLOAD_CANCELLED`                   | 53001 | Download was cancelled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `CHECKSUM_VALIDATION_FAILED`           | 53002 | Checksum validation failed for …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `HTTP_ERROR`                           | 53003 | HTTP error: … …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `NO_RESPONSE_BODY`                     | 53004 | No response body received from HTTP request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `RESPONSE_BODY_NOT_READABLE`           | 53005 | Response body is not readable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `NO_BLOB_FOUND`                        | 53006 | No blob found for …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `DOWNLOAD_ASSET_FAILED`                | 53007 | Failed to download asset…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `SEEDING_NOT_SUPPORTED`                | 53008 | Seeding is only supported for hyperdrive models                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `HYPERDRIVE_DOWNLOAD_FAILED`           | 53009 | Hyperdrive download failed: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `INVALID_SHARD_URL_PATTERN`            | 53010 | URL does not contain a valid sharded model pattern: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ARCHIVE_EXTRACTION_FAILED`            | 53011 | Failed to extract archive: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ARCHIVE_UNSUPPORTED_TYPE`             | 53012 | Unsupported archive type: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `ARCHIVE_MISSING_SHARDS`               | 53013 | Archive is missing required shard file: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `PARTIAL_DOWNLOAD_OFFLINE`             | 53014 | Cannot resume partial download (… bytes downloaded) - unable to connect. URL: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `REGISTRY_DOWNLOAD_FAILED`             | 53015 | Registry download failed: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `INSECURE_MODEL_SOURCE`                | 53016 | Refusing insecure model download from …: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `CHECKSUM_UNAVAILABLE`                 | 53017 | Model download from … could not be verified against a trusted checksum                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `DELETE_CACHE_FAILED`                  | 53200 | Failed to delete cache…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `INVALID_DELETE_CACHE_PARAMS`          | 53201 | Invalid deleteCache parameters - provide either modelId or cacheKey                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CACHE_DIR_NOT_ABSOLUTE`               | 53202 | Cache directory must be an absolute path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `CACHE_DIR_NOT_WRITABLE`               | 53203 | Cache directory is not writable: ……                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `SET_CONFIG_FAILED`                    | 53350 | Failed to set config…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `CONFIG_ALREADY_SET`                   | 53351 | Config has already been set and is immutable. Config can only be set once during SDK initialization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `FFMPEG_NOT_AVAILABLE`                 | 53500 | FFmpeg is not available on this system                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `AUDIO_PLAYER_FAILED`                  | 53501 | Audio player failed: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `INVALID_AUDIO_CHUNK_TYPE`             | 53502 | Invalid audio chunk type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `ASYNC_DISPOSE_UNAVAILABLE`            | 53503 | Host runtime does not expose Symbol.asyncDispose; the SDK request-lifecycle primitives require ES2024 `using`| `RPC_NO_DATA_RECEIVED`                 | 53703 | No data received from request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `RPC_UNKNOWN_REQUEST_TYPE`             | 53704 | Unknown request type received: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `PLUGIN_NOT_FOUND`                     | 53850 | Plugin not found for model type "…". If using a custom worker bundle, ensure the plugin is included in your qvac.config plugins array and rebuild with "npx qvac bundle sdk".                                                                                                                                                                                                                                                                                                                                                                                              |
| `PLUGIN_HANDLER_NOT_FOUND`             | 53851 | Handler "…" not found in plugin "…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `PLUGIN_REQUEST_VALIDATION_FAILED`     | 53852 | Request validation failed for handler "…"…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `PLUGIN_RESPONSE_VALIDATION_FAILED`    | 53853 | Response validation failed for handler "…"…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `PLUGIN_ALREADY_REGISTERED`            | 53854 | Plugin already registered for modelType: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `PLUGIN_HANDLER_TYPE_MISMATCH`         | 53855 | Handler "…" is …, but was called as …. Use invokePlugin() for reply handlers and invokePluginStream() for streaming handlers.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `PLUGIN_LOGGING_INVALID`               | 53856 | Plugin "…" has invalid logging configuration: …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `PLUGIN_DEFINITION_INVALID`            | 53857 | Plugin definition invalid for "…": …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PLUGIN_MODEL_TYPE_RESERVED`           | 53858 | modelType "…" is reserved for built-in plugins                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `PLUGIN_LOAD_CONFIG_VALIDATION_FAILED` | 53859 | modelConfig validation failed for "…": …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `LIFECYCLE_SUSPEND_FAILED`             | 53600 | Runtime suspend failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `LIFECYCLE_RESUME_FAILED`              | 53601 | Runtime resume failed…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `LIFECYCLE_OPERATION_BLOCKED`          | 53602 | Operation "…" is blocked while runtime state is "…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `PATH_TRAVERSAL`                       | 53900 | Path traversal detected: "…" escapes base directory "…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `QVAC_MODEL_REGISTRY_QUERY_FAILED`     | 53950 | Qvac model registry query failed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

