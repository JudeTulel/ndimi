import React, { useEffect, useState } from "react";
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import {
  completion,
  downloadAsset,
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  type ModelProgressUpdate,
  unloadModel,
  VERBOSITY,
} from "@qvac/sdk";

export default function App() {
  const [status, setStatus] = useState("Starting");
  const [output, setOutput] = useState("");
  const [progressPct, setProgressPct] = useState<number | null>(null);

  useEffect(() => {
    let modelId: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        setStatus("Downloading model");
        await downloadAsset({
          assetSrc: LLAMA_3_2_1B_INST_Q4_0,
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setProgressPct(Math.round(progress.percentage));
          },
        });
        if (cancelled) return;
        setProgressPct(null);

        setStatus("Loading model");
        modelId = await loadModel({
          modelSrc: LLAMA_3_2_1B_INST_Q4_0,
          modelType: "llm",
          modelConfig: {
            device: "gpu",
            ctx_size: 2048,
            verbosity: VERBOSITY.ERROR,
          },
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setProgressPct(Math.round(progress.percentage));
          },
        });
        if (cancelled) {
          await unloadModel({ modelId, clearStorage: false });
          return;
        }
        setProgressPct(null);

        setStatus("Running completion");
        const result = completion({
          modelId,
          history: [{ role: "user", content: "Say hello in one short sentence." }],
          stream: true,
        });
        let acc = "";
        for await (const token of result.tokenStream) {
          acc += token;
          if (!cancelled) setOutput(acc);
        }
        if (!cancelled) setStatus("Done");
      } catch (e: any) {
        if (!cancelled) setStatus(`Error: ${e?.message ?? String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
      if (modelId) {
        void unloadModel({ modelId, clearStorage: false }).catch(() => {});
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Minimal UI for the smoke test: title, status, streamed output. */}
      <View style={styles.container}>
        <Text style={styles.h1}>QVAC Smoke Test</Text>
        <Text style={styles.status}>
          {status}
          {progressPct != null ? ` (${progressPct}%)` : ""}
        </Text>
        {progressPct != null && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        )}
        <Text style={styles.output}>{output}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { color: "white", fontSize: 18, fontWeight: "600" },
  status: { color: "#A7A7B3" },
  progressBar: {
    height: 8,
    backgroundColor: "#1A1A22",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 4,
  },
  output: { color: "white", fontSize: 16, lineHeight: 22 },
});
