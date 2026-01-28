const baseUrl = process.env.HEADER_SMOKE_BASE_URL ?? 'http://localhost:8080';
const formpackPath = '/formpacks/doctor-letter/manifest.json';

const assertHeaderIncludes = (headerValue, expected, label) => {
  if (!headerValue) {
    throw new Error(`${label} header is missing.`);
  }

  const missing = expected.filter((token) => !headerValue.includes(token));
  if (missing.length > 0) {
    throw new Error(`${label} header missing tokens: ${missing.join(', ')} (got: ${headerValue}).`);
  }
};

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}.`);
  }
  return { response, text: await response.text() };
};

const fetchHeaders = async (path, label) => {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${label}.`);
  }
  return response.headers;
};

const findAssetPath = (html) => {
  const match = html.match(/\/assets\/[^"']+\.(?:js|css)/);
  if (!match) {
    throw new Error('Unable to locate a hashed asset path in index.html.');
  }
  return match[0];
};

const run = async () => {
  const { response: indexResponse, text: indexHtml } = await fetchText(`${baseUrl}/`);
  const indexCache = indexResponse.headers.get('cache-control');
  assertHeaderIncludes(indexCache, ['no-cache', 'must-revalidate'], 'index Cache-Control');

  const formpackHeaders = await fetchHeaders(formpackPath, 'formpack manifest');
  const formpackCache = formpackHeaders.get('cache-control');
  assertHeaderIncludes(formpackCache, ['no-cache', 'must-revalidate'], 'formpack Cache-Control');

  const assetPath = findAssetPath(indexHtml);
  const assetHeaders = await fetchHeaders(assetPath, 'asset');
  const assetCache = assetHeaders.get('cache-control');
  assertHeaderIncludes(assetCache, ['max-age=31536000', 'immutable'], 'asset Cache-Control');

  if (indexResponse.headers.has('strict-transport-security')) {
    throw new Error('Strict-Transport-Security should not be set on HTTP responses.');
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
