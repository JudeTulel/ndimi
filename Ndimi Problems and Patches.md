# Ndimi Problems and Patches

**Repository:** `JudeTulel/ndimi`  
**Scope:** On-device model lifecycle, translation, assistant/agent workflows, contact lookup, and USSD automation  
**Date:** 2026-10-29

## Purpose

This document records the main reliability and lifecycle problems found during the repository audit, together with the patches applied so far and the remaining work required for reliable device behavior.

## Implemented patches

### 1. Agent raw JSON was displayed to users

**Problem:** The agent parser used the first `{` and the last `}` in a model response. If a small model emitted multiple JSON objects, extra prose, or malformed JSON, the whole response failed to parse. The fallback returned the raw response as `say`, so users saw content such as:

```json
{"say":"Dialling","calls":[{"tool":"call","args":{"number":"0712345670"}}]}
```

**Patch:** `src/features/agent/prompt.ts` now:

- Extracts balanced JSON objects independently.
- Handles adjacent JSON objects without joining them together.
- Prefers a parsed object containing valid tool calls.
- Accepts the existing single-call shorthand.
- Suppresses malformed JSON instead of returning it as user-facing speech.

**Status:** Implemented.

### 2. Simple clock requests depended on model JSON compliance

**Problem:** Requests such as “What time is it?” were sent through the small chat model. A model formatting error caused the agent to return “I did not catch that” even though the correct action was trivial.

**Patch:** `src/features/agent/agentService.ts`  route common clock requests directly to the `clock` tool without invoking the model.



### 3. Contact-based calls and SMS depended on multiple model rounds

**Problem:** For requests such as “Call my landlord” or “Text Mum saying I am late,” the model had to:

1. Decide to call `contacts_find`.
2. Read a free-form contact lookup result.
3. Extract a phone number.
4. Produce a second valid tool-call JSON response.

Small models frequently failed at steps 2–4 or invented an action.

**Patch:** `src/features/agent/agentService.ts` now recognizes clear contact workflows and executes them deterministically:

- `call` and `dial` should requests perform contact lookup directly.
- `text`, `sms`, `message`, and “send an SMS” requests can resolve a contact and message directly.
- Multiple matches are not guessed; the user is asked to provide a number.
- Contact lookup failures are shown as actionable errors.
- The final tool action is run only after a valid number has been obtained.

**Status:** Not yet implemented.

### 4. USSD menu responses depended on free-form model interpretation

**Problem:** The previous flow returned USSD menu text to the model and expected it to select and emit another tool call. This was unreliable for small local models, especially when menus contained formatting, numbers, or PIN prompts.

**Patch:**

- `src/features/agent/ussd.ts` should expose `ussdSessionOpen()`.
- `src/features/agent/agentService.ts` should route inputs directly while a USSD session is open.
- Numeric replies such as `1` are sent to `ussd_reply`.
- Phrases such as “choose 1,” “select 2,” and “reply 3” are converted into menu replies.
- “Send the PIN” and similar requests call `pin_send` directly.
- Invalid menu input receives a deterministic prompt instead of another model round.
- Explicit codes such as `*334#` start a USSD session directly.

## Model lifecycle problems found

### 5. Concurrent model loads can leak native handles

`ensureModel()` in the translation, ASR, and chat services checks a shared `loaded` variable and then calls `loadModel()` without a lock. Two requests can observe an empty cache and load the same model concurrently. The later assignment overwrites the first handle, leaving the first native model loaded but unreachable.

Affected files:

- `src/features/translate/translationService.ts`
- `src/features/voice/asrService.ts`
- `src/features/chat/chatService.ts`

**Recommended patch:** Add a per-model load promise or central `ModelManager` that serializes load, reload, and unload operations.

**Status:** Not yet implemented.

### 6. ASR cancellation does not cancel native inference

`src/features/voice/asrService.ts` creates an abort callback but never subscribes it to a signal or invokes it while `transcribe()` is running. Cancelling the UI session therefore does not necessarily stop Whisper inference.

**Recommended patch:** Store the active transcription request ID and expose `cancelTranscription()`. Call `cancel({ requestId })` from the screen or pipeline cancellation path.

**Status:** Not yet implemented.

### 7. ASR is not unloaded after cancellation or failure

`src/core/pipeline/voicePipeline.ts` unloads ASR only after successful transcription. If transcription fails or is cancelled, the function returns before unloading the model.

**Recommended patch:** Move ASR cleanup into a `finally` block, while preserving the intended handoff to the translation stage.

**Status:** Not yet implemented.

### 8. Warm translation models remain loaded after leaving the workflow

The translation service deliberately keeps a model warm, but there is no screen-lifecycle unload when the user leaves translation. This can leave translation, chat, OCR, and ASR models resident in the same process.

**Recommended patch:** Introduce explicit workflow ownership or an idle timeout. Unload a model when its workflow loses ownership and no active request is using it.

**Status:** Not yet implemented.

### 9. Unload failures are hidden

The model adapters catch unload errors and immediately clear their JavaScript handle:

```ts
await unloadModel({ modelId }).catch(() => {});
loaded = null;
```

If native unloading fails, the runtime may still hold the model while the app loses the ID needed for retry or reconciliation.

**Recommended patch:** Preserve an unload-failed state, retry, and reconcile using the QVAC loaded-model inspection API before clearing the handle.

**Status:** Not yet implemented.

### 10. Model removal can race active inference

`remove()`, replacement/adoption, and background checksum verification unload models without first cancelling all active requests using those models. A request can therefore run while its model is being unloaded or its file is deleted.

**Recommended patch:** Track active request IDs by model. Cancel and await them before unloading or deleting model files.

**Status:** Not yet implemented.

### 11. Translation uses one global in-flight slot

`translationService.ts` stores only one active request in `inFlight`. If two translations overlap, the second request replaces the first. The stop action then cancels only the second request.

**Recommended patch:** Serialize translation requests or store active requests in a map keyed by request ID.

**Status:** Not yet implemented.

### 12. Registry-backed installation state can become stale

For `registry://` models, `fileExists()` treats a database row as proof that the runtime cache still contains the artifact. If QVAC evicts or clears its cache, the app can still report the model as installed and offline-ready.

**Recommended patch:** Reconcile registry assets with QVAC cache/runtime state during hydration and mark missing assets unavailable.

**Status:** Not yet implemented.

### 13. Translation runtime metadata is inconsistent

The translation catalog declares TranslatePsy models with `runtimePlugin: 'nmtcpp-translation'`, while the actual implementation loads them with `modelType: 'llamacpp-completion'` and invokes the LLM translation path.

Affected files:

- `src/features/models/catalog.ts`
- `src/features/models/modelStore.ts`
- `src/features/translate/translationService.ts`

**Recommended patch:** Separate the published artifact/plugin metadata from the verified app adapter, or update the catalog to represent the actual proven runtime path.

**Status:** Not yet implemented.

## Translation speed patches and recommendations

The translation path currently keeps the model warm, which is correct for repeated text translations. Additional low-risk optimizations are available:

1. Reduce `ctx_size` from `2048` to `1024` for short translations after testing long paragraphs.
2. Add bounded generation settings such as `predict`, `top_k`, `top_p`, `temp`, and `repeat_penalty` using the pinned QVAC SDK's supported configuration.
3. Throttle React result updates instead of calling `setResult()` for every streamed token.
4. Measure model-load time, time to first token, tokens per second, total latency, and peak memory.
5. Keep the 0.8B TranslatePsy variant as the speed-focused default and make larger variants an explicit quality choice.
6. Benchmark CPU versus the available Android acceleration path on physical devices before enabling GPU settings globally.

These changes should be benchmarked on representative Android hardware rather than inferred from desktop performance.


- Android contacts permission and contact data shape.
- Dialer and SMS URI behavior.
- `react-native-ussd-advanced` accessibility service behavior.
- Carrier-specific USSD menu timing and wording.
- QVAC native model loading and unloading.

## Recommended next patch set

The next reliability-focused implementation should introduce a central model/request manager with these responsibilities:

- Serialize loads and unloads.
- Track native model IDs and active request IDs.
- Cancel requests before model removal or replacement.
- Reconcile runtime state after failed unloads.
- Apply idle unloading and memory-aware model switching.
- Expose one typed workflow interface to the agent UI.

The contact and USSD patches reduce dependence on small-model tool planning, but they do not replace device-level integration tests for permissions, native inference, and accessibility automation.
