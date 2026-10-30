import { NativeModules, Platform } from 'react-native';

export type PinnedResponse = {
  status: number;
  body: string;
  headers: Record<string, string>;
};

const { PinnedHttpClient } = NativeModules;

/**
 * Executes an HTTPS request to the desktop host enforcing SHA-256 certificate pinning.
 *
 * On Android, this goes through our native OkHttp client with custom X509TrustManager.
 * If the certificate presented by the server does not strictly match the expected SHA-256
 * pin from the pairing QR, the connection is aborted immediately.
 */
export async function pinnedRequest(
  endpoint: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: string | undefined,
  certSha256: string
): Promise<PinnedResponse> {
  const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (Platform.OS === 'android' && PinnedHttpClient?.request) {
    return PinnedHttpClient.request(
      cleanEndpoint,
      method,
      cleanPath,
      headers,
      body ?? null,
      certSha256
    );
  }

  // Fallback for development/web environments where native modules are not loaded
  const url = `${cleanEndpoint}${cleanPath}`;
  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body,
  });

  const responseText = await response.text();
  const resHeaders: Record<string, string> = {};
  response.headers.forEach((val, key) => {
    resHeaders[key.toLowerCase()] = val;
  });

  return {
    status: response.status,
    body: responseText,
    headers: resHeaders,
  };
}
