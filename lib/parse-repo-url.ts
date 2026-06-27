const GITHUB_URL_PATTERN =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?(?:\/.*)?$/;

const SHORT_PATTERN = /^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/;

export type ParsedRepo = {
  owner: string;
  name: string;
  githubUrl: string;
};

export function parseRepoInput(input: string): ParsedRepo | null {
  const trimmed = input.trim().replace(/\/$/, "");

  const urlMatch = trimmed.match(GITHUB_URL_PATTERN);
  if (urlMatch) {
    const owner = urlMatch[1];
    const name = urlMatch[2];
    return {
      owner,
      name,
      githubUrl: `https://github.com/${owner}/${name}`,
    };
  }

  const shortMatch = trimmed.match(SHORT_PATTERN);
  if (shortMatch) {
    const owner = shortMatch[1];
    const name = shortMatch[2];
    return {
      owner,
      name,
      githubUrl: `https://github.com/${owner}/${name}`,
    };
  }

  return null;
}
