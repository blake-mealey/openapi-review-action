# OpenAPI Review Action

A GitHub action for reviewing changes to your OpenAPI specs.

This action posts a comment to your PR whenever you make a change to an OpenAPI spec file, with
helpful details for your reviewers to catch more potential problems and give better feedback!

- Review your spec's diff to make sure you aren't introducing breaking changes for your users
- Make sure your API's docs are complete and up to snuff before accepting a change

⚡ Powered by [openapi-diff](https://bitbucket.org/atlassian/openapi-diff) and
[widdershins](https://github.com/Mermade/widdershins)!

Supported events:

- `pull_request`

## Example usage

```yaml
# Make sure you checkout your repo before first!
- uses: actions/checkout@v1
- uses: blake-mealey/openapi-review-action@v1
  with:
    spec-paths: ./specs/*.yaml
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

### spec-paths (required)

The paths to the OpenAPI specs to process (single glob or array of globs). See the
[glob](https://www.npmjs.com/package/glob) package for information on glob syntax support. JSON and
yaml files are supported. Relative paths must start with `./`.

```yml
spec-paths: ./your-spec.json
```

```yml
spec-paths: [./your-spec.yaml, ./your-spec.json]
```

```yml
spec-paths: [./root-spec.yaml, ./specs/*.yaml]
```

### github-token (required)

Your GitHub token to allow the action to create PR comments. Use the `${{ secrets.GITHUB_TOKEN }}`
variable.

```yml
github-token: ${{ secrets.GITHUB_TOKEN }}
```

### fail-on-breaking-changes (optional)

Defaults to true. Whether or not the action should report a failure if the openapi-diff report found
breaking changes.

### converter-options (optional)

Optionally pass options to the widdershins OpenAPI docs converter. See available options in [their
documentation](https://github.com/Mermade/widdershins#options).

```yml
converter-options:
  expandBody: true
  # ...
```
